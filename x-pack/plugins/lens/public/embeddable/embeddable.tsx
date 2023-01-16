/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniqBy } from 'lodash';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  DataViewBase,
  EsQueryConfig,
  Filter,
  Query,
  AggregateQuery,
  TimeRange,
  isOfQueryType,
} from '@kbn/es-query';
import type { PaletteOutput } from '@kbn/coloring';
import {
  DataPublicPluginStart,
  ExecutionContextSearch,
  TimefilterContract,
  FilterManager,
  getEsQueryConfig,
  mapAndFlattenFilters,
} from '@kbn/data-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';

import { Subscription } from 'rxjs';
import { toExpression, Ast } from '@kbn/interpreter';
import { DefaultInspectorAdapters, ErrorLike, RenderMode } from '@kbn/expressions-plugin/common';
import { map, distinctUntilChanged, skip } from 'rxjs/operators';
import fastIsEqual from 'fast-deep-equal';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
  SavedObjectEmbeddableInput,
  ReferenceOrValueEmbeddable,
  SelfStyledEmbeddable,
  FilterableEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import type {
  Capabilities,
  IBasePath,
  IUiSettingsClient,
  KibanaExecutionContext,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { BrushTriggerEvent, ClickTriggerEvent, Warnings } from '@kbn/charts-plugin/public';
import { DataViewPersistableStateService, DataViewSpec } from '@kbn/data-views-plugin/common';
import { getExecutionContextEvents, trackUiCounterEvents } from '../lens_ui_telemetry';
import { Document } from '../persistence';
import { ExpressionWrapper, ExpressionWrapperProps } from './expression_wrapper';
import {
  isLensBrushEvent,
  isLensFilterEvent,
  isLensEditEvent,
  isLensTableRowContextMenuClickEvent,
  LensTableRowContextMenuEvent,
  VisualizationMap,
  Visualization,
  DatasourceMap,
  Datasource,
  IndexPatternMap,
} from '../types';

import { getEditPath, DOC_TYPE } from '../../common';
import { LensAttributeService } from '../lens_attribute_service';
import type { ErrorMessage, TableInspectorAdapter } from '../editor_frame_service/types';
import { getLensInspectorService, LensInspector } from '../lens_inspector_service';
import { SharingSavedObjectProps, VisualizationDisplayOptions } from '../types';
import {
  getActiveDatasourceIdFromDoc,
  getIndexPatternsObjects,
  getSearchWarningMessages,
  inferTimeField,
} from '../utils';
import { getLayerMetaInfo, combineQueryAndFilters } from '../app_plugin/show_underlying_data';
import { convertDataViewIntoLensIndexPattern } from '../data_views_service/loader';

export type LensSavedObjectAttributes = Omit<Document, 'savedObjectId' | 'type'>;

export interface LensUnwrapMetaInfo {
  sharingSavedObjectProps?: SharingSavedObjectProps;
}

export interface LensUnwrapResult {
  attributes: LensSavedObjectAttributes;
  metaInfo?: LensUnwrapMetaInfo;
}

interface LensBaseEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  palette?: PaletteOutput;
  renderMode?: RenderMode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
  onBrushEnd?: (data: BrushTriggerEvent['data']) => void;
  onLoad?: (isLoading: boolean, adapters?: Partial<DefaultInspectorAdapters>) => void;
  onFilter?: (data: ClickTriggerEvent['data']) => void;
  onTableRowClick?: (data: LensTableRowContextMenuEvent['data']) => void;
}

export type LensByValueInput = {
  attributes: LensSavedObjectAttributes;
} & LensBaseEmbeddableInput;

export type LensByReferenceInput = SavedObjectEmbeddableInput & LensBaseEmbeddableInput;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: DataView[];
}

export interface LensEmbeddableDeps {
  attributeService: LensAttributeService;
  data: DataPublicPluginStart;
  documentToExpression: (
    doc: Document
  ) => Promise<{ ast: Ast | null; errors: ErrorMessage[] | undefined }>;
  injectFilterReferences: FilterManager['inject'];
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  dataViews: DataViewsContract;
  expressionRenderer: ReactExpressionRendererType;
  timefilter: TimefilterContract;
  basePath: IBasePath;
  inspector: InspectorStart;
  getTrigger?: UiActionsStart['getTrigger'] | undefined;
  getTriggerCompatibleActions?: UiActionsStart['getTriggerCompatibleActions'];
  capabilities: {
    canSaveVisualizations: boolean;
    canSaveDashboards: boolean;
    navLinks: Capabilities['navLinks'];
    discover: Capabilities['discover'];
  };
  usageCollection?: UsageCollectionSetup;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
}

export interface ViewUnderlyingDataArgs {
  dataViewSpec: DataViewSpec;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  columns: string[];
}

const getExpressionFromDocument = async (
  document: Document,
  documentToExpression: LensEmbeddableDeps['documentToExpression']
) => {
  const { ast, errors } = await documentToExpression(document);
  return {
    expression: ast ? toExpression(ast) : null,
    errors,
  };
};

function getViewUnderlyingDataArgs({
  activeDatasource,
  activeDatasourceState,
  activeData,
  dataViews,
  capabilities,
  query,
  filters,
  timeRange,
  esQueryConfig,
  indexPatternsCache,
}: {
  activeDatasource: Datasource;
  activeDatasourceState: unknown;
  activeData: TableInspectorAdapter | undefined;
  dataViews: DataViewBase[] | undefined;
  capabilities: LensEmbeddableDeps['capabilities'];
  query: ExecutionContextSearch['query'];
  filters: Filter[];
  timeRange: TimeRange;
  esQueryConfig: EsQueryConfig;
  indexPatternsCache: IndexPatternMap;
}) {
  const { error, meta } = getLayerMetaInfo(
    activeDatasource,
    activeDatasourceState,
    activeData,
    indexPatternsCache,
    timeRange,
    capabilities
  );

  if (error || !meta) {
    return;
  }
  const luceneOrKuery: Query[] = [];
  const aggregateQuery: AggregateQuery[] = [];

  if (Array.isArray(query)) {
    query.forEach((q) => {
      if (isOfQueryType(q)) {
        luceneOrKuery.push(q);
      } else {
        aggregateQuery.push(q);
      }
    });
  }

  const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
    luceneOrKuery.length > 0 ? luceneOrKuery : (query as Query),
    filters,
    meta,
    dataViews,
    esQueryConfig
  );

  const dataViewSpec = indexPatternsCache[meta.id]!.spec;

  return {
    dataViewSpec,
    timeRange,
    filters: newFilters,
    query: aggregateQuery.length > 0 ? aggregateQuery[0] : newQuery,
    columns: meta.columns,
  };
}

export class Embeddable
  extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput>
  implements
    ReferenceOrValueEmbeddable<LensByValueInput, LensByReferenceInput>,
    SelfStyledEmbeddable,
    FilterableEmbeddable
{
  type = DOC_TYPE;

  deferEmbeddableLoad = true;

  private expressionRenderer: ReactExpressionRendererType;
  private savedVis: Document | undefined;
  private expression: string | undefined | null;
  private domNode: HTMLElement | Element | undefined;
  private warningDomNode: HTMLElement | Element | undefined;
  private subscription: Subscription;
  private isInitialized = false;
  private errors: ErrorMessage[] | undefined;
  private inputReloadSubscriptions: Subscription[];
  private isDestroyed?: boolean;
  private embeddableTitle?: string;
  private lensInspector: LensInspector;

  private logError(type: 'runtime' | 'validation') {
    trackUiCounterEvents(
      type === 'runtime' ? 'embeddable_runtime_error' : 'embeddable_validation_error',
      this.getExecutionContext()
    );
  }

  private externalSearchContext: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
    searchSessionId?: string;
  } = {};

  private activeDataInfo: {
    activeData?: TableInspectorAdapter;
    activeDatasource?: Datasource;
    activeDatasourceState?: unknown;
  } = {};

  private indexPatterns: DataView[] = [];

  private viewUnderlyingDataArgs?: ViewUnderlyingDataArgs;

  constructor(
    private deps: LensEmbeddableDeps,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        editApp: 'lens',
      },
      parent
    );

    this.lensInspector = getLensInspectorService(deps.inspector);
    this.expressionRenderer = deps.expressionRenderer;
    let containerStateChangedCalledAlready = false;
    this.initializeSavedVis(initialInput)
      .then(() => {
        if (!containerStateChangedCalledAlready) {
          this.onContainerStateChanged(initialInput);
        } else {
          this.reload();
        }
      })
      .catch((e) => this.onFatalError(e));

    this.subscription = this.getUpdated$().subscribe(() => {
      containerStateChangedCalledAlready = true;
      this.onContainerStateChanged(this.input);
    });

    const input$ = this.getInput$();
    this.embeddableTitle = this.getTitle();

    this.inputReloadSubscriptions = [];

    // Lens embeddable does not re-render when embeddable input changes in
    // general, to improve performance. This line makes sure the Lens embeddable
    // re-renders when anything in ".dynamicActions" (e.g. drilldowns) changes.
    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          map((input) => input.enhancements?.dynamicActions),
          distinctUntilChanged((a, b) => fastIsEqual(a, b)),
          skip(1)
        )
        .subscribe((input) => {
          this.reload();
        })
    );

    // Lens embeddable does not re-render when embeddable input changes in
    // general, to improve performance. This line makes sure the Lens embeddable
    // re-renders when dashboard view mode switches between "view/edit". This is
    // needed to see the changes to ".dynamicActions" (e.g. drilldowns) when
    // dashboard's mode is toggled.
    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          map((input) => input.viewMode),
          distinctUntilChanged(),
          skip(1)
        )
        .subscribe((input) => {
          // only reload if drilldowns are set
          if (this.getInput().enhancements?.dynamicActions) {
            this.reload();
          }
        })
    );

    // Re-initialize the visualization if either the attributes or the saved object id changes

    this.inputReloadSubscriptions.push(
      input$
        .pipe(
          distinctUntilChanged((a, b) =>
            fastIsEqual(
              ['attributes' in a && a.attributes, 'savedObjectId' in a && a.savedObjectId],
              ['attributes' in b && b.attributes, 'savedObjectId' in b && b.savedObjectId]
            )
          ),
          skip(1)
        )
        .subscribe(async (input) => {
          await this.initializeSavedVis(input);
          this.reload();
        })
    );

    // Update search context and reload on changes related to search
    this.inputReloadSubscriptions.push(
      this.getUpdated$()
        .pipe(map(() => this.getInput()))
        .pipe(
          distinctUntilChanged((a, b) =>
            fastIsEqual(
              [a.filters, a.query, a.timeRange, a.searchSessionId],
              [b.filters, b.query, b.timeRange, b.searchSessionId]
            )
          ),
          skip(1)
        )
        .subscribe(async (input) => {
          this.onContainerStateChanged(input);
        })
    );
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  public supportedTriggers() {
    if (!this.savedVis || !this.savedVis.visualizationType) {
      return [];
    }

    return this.deps.visualizationMap[this.savedVis.visualizationType]?.triggers || [];
  }

  public getInspectorAdapters() {
    return this.lensInspector.adapters;
  }

  private maybeAddConflictError(
    errors?: ErrorMessage[],
    sharingSavedObjectProps?: SharingSavedObjectProps
  ) {
    const ret = [...(errors || [])];

    if (sharingSavedObjectProps?.outcome === 'conflict' && !!this.deps.spaces) {
      ret.push({
        shortMessage: i18n.translate('xpack.lens.embeddable.legacyURLConflict.shortMessage', {
          defaultMessage: `You've encountered a URL conflict`,
        }),
        longMessage: (
          <this.deps.spaces.ui.components.getEmbeddableLegacyUrlConflict
            targetType={DOC_TYPE}
            sourceId={sharingSavedObjectProps.sourceId!}
          />
        ),
      });
    }

    return ret?.length ? ret : undefined;
  }

  private maybeAddTimeRangeError(
    errors: ErrorMessage[] | undefined,
    input: LensEmbeddableInput,
    indexPatterns: DataView[]
  ) {
    // if at least one indexPattern is time based, then the Lens embeddable requires the timeRange prop
    if (
      input.timeRange == null &&
      indexPatterns.some((indexPattern) => indexPattern.isTimeBased())
    ) {
      return [
        ...(errors || []),
        {
          shortMessage: i18n.translate('xpack.lens.embeddable.missingTimeRangeParam.shortMessage', {
            defaultMessage: `Missing timeRange property`,
          }),
          longMessage: i18n.translate('xpack.lens.embeddable.missingTimeRangeParam.longMessage', {
            defaultMessage: `The timeRange property is required for the given configuration`,
          }),
        },
      ];
    }
    return errors;
  }

  async initializeSavedVis(input: LensEmbeddableInput) {
    const unwrapResult: LensUnwrapResult | false = await this.deps.attributeService
      .unwrapAttributes(input)
      .catch((e: Error) => {
        this.onFatalError(e);
        return false;
      });
    if (!unwrapResult || this.isDestroyed) {
      return;
    }

    const { metaInfo, attributes } = unwrapResult;

    this.savedVis = {
      ...attributes,
      type: this.type,
      savedObjectId: (input as LensByReferenceInput)?.savedObjectId,
    };

    const { expression, errors } = await getExpressionFromDocument(
      this.savedVis,
      this.deps.documentToExpression
    );
    this.expression = expression;
    this.errors = this.maybeAddConflictError(errors, metaInfo?.sharingSavedObjectProps);

    await this.initializeOutput();

    this.isInitialized = true;
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    if (this.handleContainerStateChanged(containerState)) {
      this.reload();
    }
  }

  handleContainerStateChanged(containerState: LensEmbeddableInput): boolean {
    let isDirty = false;
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter((filter) => !filter.meta.disabled)
      : undefined;
    const nextTimeRange =
      containerState.timeslice !== undefined
        ? {
            from: new Date(containerState.timeslice[0]).toISOString(),
            to: new Date(containerState.timeslice[1]).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : containerState.timeRange;
    if (
      !isEqual(nextTimeRange, this.externalSearchContext.timeRange) ||
      !isEqual(containerState.query, this.externalSearchContext.query) ||
      !isEqual(cleanedFilters, this.externalSearchContext.filters) ||
      this.externalSearchContext.searchSessionId !== containerState.searchSessionId ||
      this.embeddableTitle !== this.getTitle()
    ) {
      this.externalSearchContext = {
        timeRange: nextTimeRange,
        query: containerState.query,
        filters: cleanedFilters,
        searchSessionId: containerState.searchSessionId,
      };
      this.embeddableTitle = this.getTitle();
      isDirty = true;
    }

    return isDirty;
  }

  private handleWarnings(adapters?: Partial<DefaultInspectorAdapters>) {
    const activeDatasourceId = getActiveDatasourceIdFromDoc(this.savedVis);

    if (!activeDatasourceId || !adapters?.requests) {
      return;
    }

    const activeDatasource = this.deps.datasourceMap[activeDatasourceId];
    const docDatasourceState = this.savedVis?.state.datasourceStates[activeDatasourceId];

    const requestWarnings = getSearchWarningMessages(
      adapters.requests,
      activeDatasource,
      docDatasourceState,
      {
        searchService: this.deps.data.search,
      }
    );

    if (requestWarnings.length && this.warningDomNode) {
      render(
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <Warnings warnings={requestWarnings} compressed />
        </KibanaThemeProvider>,
        this.warningDomNode
      );
    }
  }

  private updateActiveData: ExpressionWrapperProps['onData$'] = (data, adapters) => {
    this.activeDataInfo.activeData = adapters?.tables?.tables;
    if (this.input.onLoad) {
      // once onData$ is get's called from expression renderer, loading becomes false
      this.input.onLoad(false, adapters);
    }

    const { type, error } = data as { type: string; error: ErrorLike };
    this.updateOutput({
      ...this.getOutput(),
      loading: false,
      error: type === 'error' ? error : undefined,
    });

    this.handleWarnings(adapters);
  };

  private onRender: ExpressionWrapperProps['onRender$'] = () => {
    let datasourceEvents: string[] = [];
    let visualizationEvents: string[] = [];

    if (this.savedVis) {
      datasourceEvents = Object.values(this.deps.datasourceMap).reduce<string[]>(
        (acc, datasource) => [
          ...acc,
          ...(datasource.getRenderEventCounters?.(
            this.savedVis!.state.datasourceStates[datasource.id]
          ) ?? []),
        ],
        []
      );

      if (this.savedVis.visualizationType) {
        visualizationEvents =
          this.deps.visualizationMap[this.savedVis.visualizationType].getRenderEventCounters?.(
            this.savedVis!.state.visualization
          ) ?? [];
      }
    }

    const executionContext = this.getExecutionContext();

    const events = [
      ...datasourceEvents,
      ...visualizationEvents,
      ...getExecutionContextEvents(executionContext),
    ];

    const adHocDataViews = Object.values(this.savedVis?.state.adHocDataViews || {});
    adHocDataViews.forEach(() => {
      events.push('ad_hoc_data_view');
    });

    trackUiCounterEvents(events, executionContext);

    this.renderComplete.dispatchComplete();
    this.updateOutput({
      ...this.getOutput(),
      rendered: true,
    });
  };

  getExecutionContext() {
    if (this.savedVis) {
      const parentContext = this.parent?.getInput().executionContext || this.input.executionContext;
      const child: KibanaExecutionContext = {
        type: 'lens',
        name: this.savedVis.visualizationType ?? '',
        id: this.id,
        description: this.savedVis.title || this.input.title || '',
        url: this.output.editUrl,
      };

      return parentContext
        ? {
            ...parentContext,
            child,
          }
        : child;
    }
  }

  private getError(): Error | undefined {
    const message =
      typeof this.errors?.[0]?.longMessage === 'string'
        ? this.errors[0].longMessage
        : this.errors?.[0]?.shortMessage;

    if (message != null) {
      return new Error(message);
    }

    if (!this.expression) {
      return new Error(
        i18n.translate('xpack.lens.embeddable.failure', {
          defaultMessage: "Visualization couldn't be displayed",
        })
      );
    }
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    if (!this.savedVis || !this.isInitialized || this.isDestroyed) {
      return;
    }
    super.render(domNode as HTMLElement);
    if (this.input.onLoad) {
      this.input.onLoad(true);
    }

    this.domNode.setAttribute('data-shared-item', '');

    const error = this.getError();

    this.updateOutput({
      ...this.getOutput(),
      loading: true,
      error,
    });

    if (error) {
      this.renderComplete.dispatchError();
    } else {
      this.renderComplete.dispatchInProgress();
    }

    const input = this.getInput();

    render(
      <KibanaThemeProvider theme$={this.deps.theme.theme$}>
        <ExpressionWrapper
          ExpressionRenderer={this.expressionRenderer}
          expression={this.expression || null}
          errors={this.errors}
          lensInspector={this.lensInspector}
          searchContext={this.getMergedSearchContext()}
          variables={{
            embeddableTitle: this.getTitle(),
            ...(input.palette ? { theme: { palette: input.palette } } : {}),
          }}
          searchSessionId={this.externalSearchContext.searchSessionId}
          handleEvent={this.handleEvent}
          onData$={this.updateActiveData}
          onRender$={this.onRender}
          interactive={!input.disableTriggers}
          renderMode={input.renderMode}
          syncColors={input.syncColors}
          syncTooltips={input.syncTooltips}
          syncCursor={input.syncCursor}
          hasCompatibleActions={this.hasCompatibleActions}
          className={input.className}
          style={input.style}
          executionContext={this.getExecutionContext()}
          canEdit={this.getIsEditable() && input.viewMode === 'edit'}
          onRuntimeError={(message) => {
            this.updateOutput({ error: new Error(message) });
            this.logError('runtime');
          }}
          noPadding={this.visDisplayOptions.noPadding}
        />
        <div
          css={css({
            position: 'absolute',
            zIndex: 2,
            left: 0,
            bottom: 0,
          })}
          ref={(el) => {
            if (el) {
              this.warningDomNode = el;
            }
          }}
        />
      </KibanaThemeProvider>,
      domNode
    );
  }

  private readonly hasCompatibleActions = async (
    event: ExpressionRendererEvent
  ): Promise<boolean> => {
    if (isLensTableRowContextMenuClickEvent(event) || isLensFilterEvent(event)) {
      const { getTriggerCompatibleActions } = this.deps;
      if (!getTriggerCompatibleActions) {
        return false;
      }
      const actions = await getTriggerCompatibleActions(VIS_EVENT_TO_TRIGGER[event.name], {
        data: event.data,
        embeddable: this,
      });

      return actions.length > 0;
    }

    return false;
  };

  /**
   * Combines the embeddable context with the saved object context, and replaces
   * any references to index patterns
   */
  private getMergedSearchContext(): ExecutionContextSearch {
    if (!this.savedVis) {
      throw new Error('savedVis is required for getMergedSearchContext');
    }

    const context: ExecutionContextSearch = {
      timeRange: this.externalSearchContext.timeRange,
      query: [this.savedVis.state.query],
      filters: this.deps.injectFilterReferences(
        this.savedVis.state.filters,
        this.savedVis.references
      ),
      disableShardWarnings: true,
    };

    if (this.externalSearchContext.query) {
      context.query = [this.externalSearchContext.query, ...(context.query as Query[])];
    }

    if (this.externalSearchContext.filters?.length) {
      context.filters = [...this.externalSearchContext.filters, ...(context.filters as Filter[])];
    }

    return context;
  }

  private get onEditAction(): Visualization['onEditAction'] {
    const visType = this.savedVis?.visualizationType;

    if (!visType) {
      return;
    }

    return this.deps.visualizationMap[visType].onEditAction;
  }

  handleEvent = async (event: ExpressionRendererEvent) => {
    if (!this.deps.getTrigger || this.input.disableTriggers) {
      return;
    }
    if (isLensBrushEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: {
          ...event.data,
          timeFieldName:
            event.data.timeFieldName ||
            inferTimeField(this.deps.data.datatableUtilities, event.data),
        },
        embeddable: this,
      });

      if (this.input.onBrushEnd) {
        this.input.onBrushEnd(event.data);
      }
    }
    if (isLensFilterEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: {
          ...event.data,
          timeFieldName:
            event.data.timeFieldName ||
            inferTimeField(this.deps.data.datatableUtilities, event.data),
        },
        embeddable: this,
      });
      if (this.input.onFilter) {
        this.input.onFilter(event.data);
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec(
        {
          data: event.data,
          embeddable: this,
        },
        true
      );
      if (this.input.onTableRowClick) {
        this.input.onTableRowClick(event.data as unknown as LensTableRowContextMenuEvent['data']);
      }
    }

    // We allow for edit actions in the Embeddable for display purposes only (e.g. changing the datatable sort order).
    // No state changes made here with an edit action are persisted.
    if (isLensEditEvent(event) && this.onEditAction) {
      if (!this.savedVis) return;

      // have to dance since this.savedVis.state is readonly
      const newVis = JSON.parse(JSON.stringify(this.savedVis)) as Document;
      newVis.state.visualization = this.onEditAction(newVis.state.visualization, event);
      this.savedVis = newVis;

      const { expression, errors } = await getExpressionFromDocument(
        this.savedVis,
        this.deps.documentToExpression
      );
      this.expression = expression;
      this.errors = errors;

      this.reload();
    }
  };

  reload() {
    if (!this.savedVis || !this.isInitialized || this.isDestroyed) {
      return;
    }
    this.handleContainerStateChanged(this.input);
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  private async loadViewUnderlyingDataArgs(): Promise<boolean> {
    if (!this.savedVis || !this.activeDataInfo.activeData) {
      return false;
    }
    const mergedSearchContext = this.getMergedSearchContext();

    if (!mergedSearchContext.timeRange) {
      return false;
    }

    const activeDatasourceId = getActiveDatasourceIdFromDoc(this.savedVis);
    if (!activeDatasourceId) {
      return false;
    }

    this.activeDataInfo.activeDatasource = this.deps.datasourceMap[activeDatasourceId];
    const docDatasourceState = this.savedVis?.state.datasourceStates[activeDatasourceId];
    const adHocDataviews = await Promise.all(
      Object.values(this.savedVis?.state.adHocDataViews || {})
        .map((persistedSpec) => {
          return DataViewPersistableStateService.inject(persistedSpec, [
            ...(this.savedVis?.references || []),
            ...(this.savedVis?.state.internalReferences || []),
          ]);
        })
        .map((spec) => this.deps.dataViews.create(spec))
    );

    const allIndexPatterns = [...this.indexPatterns, ...adHocDataviews];

    const indexPatternsCache = allIndexPatterns.reduce(
      (acc, indexPattern) => ({
        [indexPattern.id!]: convertDataViewIntoLensIndexPattern(indexPattern),
        ...acc,
      }),
      {}
    );

    if (!this.activeDataInfo.activeDatasourceState) {
      this.activeDataInfo.activeDatasourceState = this.activeDataInfo.activeDatasource.initialize(
        docDatasourceState,
        [...(this.savedVis?.references || []), ...(this.savedVis?.state.internalReferences || [])],
        undefined,
        undefined,
        indexPatternsCache
      );
    }

    const viewUnderlyingDataArgs = getViewUnderlyingDataArgs({
      activeDatasource: this.activeDataInfo.activeDatasource,
      activeDatasourceState: this.activeDataInfo.activeDatasourceState,
      activeData: this.activeDataInfo.activeData,
      dataViews: this.indexPatterns,
      capabilities: this.deps.capabilities,
      query: mergedSearchContext.query,
      filters: mergedSearchContext.filters || [],
      timeRange: mergedSearchContext.timeRange,
      esQueryConfig: getEsQueryConfig(this.deps.uiSettings),
      indexPatternsCache,
    });

    const loaded = typeof viewUnderlyingDataArgs !== 'undefined';
    if (loaded) {
      this.viewUnderlyingDataArgs = viewUnderlyingDataArgs;
    }
    return loaded;
  }

  /**
   * Returns the necessary arguments to view the underlying data in discover.
   *
   * Only makes sense to call this after canViewUnderlyingData has been checked
   */
  public getViewUnderlyingDataArgs() {
    return this.viewUnderlyingDataArgs;
  }

  public canViewUnderlyingData() {
    return this.loadViewUnderlyingDataArgs();
  }

  async initializeOutput() {
    if (!this.savedVis) {
      return;
    }

    const { indexPatterns } = await getIndexPatternsObjects(
      this.savedVis?.references.map(({ id }) => id) || [],
      this.deps.dataViews
    );
    (
      await Promise.all(
        Object.values(this.savedVis?.state.adHocDataViews || {}).map((spec) =>
          this.deps.dataViews.create(spec)
        )
      )
    ).forEach((dataView) => indexPatterns.push(dataView));

    this.indexPatterns = uniqBy(indexPatterns, 'id');

    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();

    this.errors = this.maybeAddTimeRangeError(this.errors, input, this.indexPatterns);

    if (this.errors) {
      this.logError('validation');
    }

    const title = input.hidePanelTitles ? '' : input.title ?? this.savedVis.title;
    const savedObjectId = (input as LensByReferenceInput).savedObjectId;
    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: this.savedVis.title,
      editable: this.getIsEditable(),
      title,
      editPath: getEditPath(savedObjectId),
      editUrl: this.deps.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
      indexPatterns: this.indexPatterns,
    });

    // deferred loading of this embeddable is complete
    this.setInitializationFinished();
  }

  private getIsEditable() {
    return (
      this.deps.capabilities.canSaveVisualizations ||
      (!this.inputIsRefType(this.getInput()) && this.deps.capabilities.canSaveDashboards)
    );
  }

  public inputIsRefType = (
    input: LensByValueInput | LensByReferenceInput
  ): input is LensByReferenceInput => {
    return this.deps.attributeService.inputIsRefType(input);
  };

  public getInputAsRefType = async (): Promise<LensByReferenceInput> => {
    return this.deps.attributeService.getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  };

  public getInputAsValueType = async (): Promise<LensByValueInput> => {
    return this.deps.attributeService.getInputAsValueType(this.getExplicitInput());
  };

  // same API as Visualize
  public getDescription() {
    // mind that savedViz is loaded in async way here
    return this.savedVis && this.savedVis.description;
  }

  /**
   * Gets the Lens embeddable's local filters
   * @returns Local/panel-level array of filters for Lens embeddable
   */
  public async getFilters() {
    return mapAndFlattenFilters(
      this.deps.injectFilterReferences(
        this.savedVis?.state.filters ?? [],
        this.savedVis?.references ?? []
      )
    );
  }

  /**
   * Gets the Lens embeddable's local query
   * @returns Local/panel-level query for Lens embeddable
   */
  public async getQuery() {
    return this.savedVis?.state.query;
  }

  public getSavedVis(): Readonly<Document | undefined> {
    return this.savedVis;
  }

  destroy() {
    this.isDestroyed = true;
    super.destroy();
    if (this.inputReloadSubscriptions.length > 0) {
      this.inputReloadSubscriptions.forEach((reloadSub) => {
        reloadSub.unsubscribe();
      });
    }
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public getSelfStyledOptions() {
    return {
      hideTitle: this.visDisplayOptions.noPanelTitle,
    };
  }

  private get visDisplayOptions(): VisualizationDisplayOptions {
    if (!this.savedVis?.visualizationType) {
      return {};
    }

    let displayOptions =
      this.deps.visualizationMap[this.savedVis.visualizationType]?.getDisplayOptions?.() ?? {};

    if (this.input.noPadding !== undefined) {
      displayOptions = {
        ...displayOptions,
        noPadding: this.input.noPadding,
      };
    }

    return displayOptions;
  }
}
