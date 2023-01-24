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
  cellValueTrigger,
  CELL_VALUE_TRIGGER,
  type CellValueContext,
} from '@kbn/embeddable-plugin/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import type {
  Capabilities,
  CoreStart,
  IBasePath,
  IUiSettingsClient,
  KibanaExecutionContext,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { BrushTriggerEvent, ClickTriggerEvent, Warnings } from '@kbn/charts-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
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
  GetCompatibleCellValueActions,
  UserMessage,
  IndexPatternRef,
  FrameDatasourceAPI,
  AddUserMessages,
  isMessageRemovable,
  UserMessagesGetter,
} from '../types';

import { getEditPath, DOC_TYPE } from '../../common';
import { LensAttributeService } from '../lens_attribute_service';
import type { TableInspectorAdapter } from '../editor_frame_service/types';
import { getLensInspectorService, LensInspector } from '../lens_inspector_service';
import { SharingSavedObjectProps, VisualizationDisplayOptions } from '../types';
import {
  getActiveDatasourceIdFromDoc,
  getActiveVisualizationIdFromDoc,
  getIndexPatternsObjects,
  getSearchWarningMessages,
  inferTimeField,
} from '../utils';
import { getLayerMetaInfo, combineQueryAndFilters } from '../app_plugin/show_underlying_data';
import {
  filterUserMessages,
  getApplicationUserMessages,
} from '../app_plugin/get_application_user_messages';

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
  documentToExpression: (doc: Document) => Promise<{
    ast: Ast | null;
    indexPatterns: IndexPatternMap;
    indexPatternRefs: IndexPatternRef[];
  }>;
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
  coreStart: CoreStart;
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
  const { ast, indexPatterns, indexPatternRefs } = await documentToExpression(document);
  return { ast: ast ? toExpression(ast) : null, indexPatterns, indexPatternRefs };
};

function getViewUnderlyingDataArgs({
  activeDatasource,
  activeDatasourceState,
  activeVisualization,
  activeVisualizationState,
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
  activeVisualization: Visualization;
  activeVisualizationState: unknown;
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
    activeVisualization,
    activeVisualizationState,
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

  private activeData?: TableInspectorAdapter;

  private dataViews: DataView[] = [];

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
        this.loadUserMessages();
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

  private get activeDatasourceId() {
    return getActiveDatasourceIdFromDoc(this.savedVis);
  }

  private get activeDatasource() {
    if (!this.activeDatasourceId) return;
    return this.deps.datasourceMap[this.activeDatasourceId];
  }

  private get activeVisualizationId() {
    return getActiveVisualizationIdFromDoc(this.savedVis);
  }

  private get activeVisualization() {
    if (!this.activeVisualizationId) return;
    return this.deps.visualizationMap[this.activeVisualizationId];
  }

  private get activeVisualizationState() {
    if (!this.activeVisualization) return;
    return this.activeVisualization.initialize(() => '', this.savedVis?.state.visualization);
  }

  private indexPatterns: IndexPatternMap = {};

  private indexPatternRefs: IndexPatternRef[] = [];

  private get activeDatasourceState(): undefined | unknown {
    if (!this.activeDatasourceId || !this.activeDatasource) return;

    const docDatasourceState = this.savedVis?.state.datasourceStates[this.activeDatasourceId];

    return this.activeDatasource.initialize(
      docDatasourceState,
      [...(this.savedVis?.references || []), ...(this.savedVis?.state.internalReferences || [])],
      undefined,
      undefined,
      this.indexPatterns
    );
  }

  public getUserMessages: UserMessagesGetter = (locationId, filters) => {
    return filterUserMessages(
      [...this._userMessages, ...Object.values(this.additionalUserMessages)],
      locationId,
      filters
    );
  };

  private get hasAnyErrors() {
    return this.getUserMessages(undefined, { severity: 'error' }).length > 0;
  }

  private _userMessages: UserMessage[] = [];

  // loads all available user messages
  private loadUserMessages() {
    const userMessages: UserMessage[] = [];

    if (this.activeVisualizationState && this.activeDatasource) {
      userMessages.push(
        ...getApplicationUserMessages({
          visualizationType: this.savedVis?.visualizationType,
          visualization: {
            state: this.activeVisualizationState,
            activeId: this.activeVisualizationId,
          },
          visualizationMap: this.deps.visualizationMap,
          activeDatasource: this.activeDatasource,
          activeDatasourceState: { state: this.activeDatasourceState },
          dataViews: {
            indexPatterns: this.indexPatterns,
            indexPatternRefs: this.indexPatternRefs, // TODO - are these actually used?
          },
          core: this.deps.coreStart,
        })
      );
    }

    const mergedSearchContext = this.getMergedSearchContext();

    if (!this.savedVis) {
      return userMessages;
    }

    const frameDatasourceAPI: FrameDatasourceAPI = {
      dataViews: {
        indexPatterns: this.indexPatterns,
        indexPatternRefs: this.indexPatternRefs,
      },
      datasourceLayers: {}, // TODO
      query: this.savedVis.state.query,
      filters: mergedSearchContext.filters ?? [],
      dateRange: {
        fromDate: mergedSearchContext.timeRange?.from ?? '',
        toDate: mergedSearchContext.timeRange?.to ?? '',
      },
      activeData: this.activeData,
    };

    userMessages.push(
      ...(this.activeDatasource?.getUserMessages(this.activeDatasourceState, {
        setState: () => {},
        frame: frameDatasourceAPI,
      }) ?? []),
      ...(this.activeVisualization?.getUserMessages?.(this.activeVisualizationState, {
        frame: frameDatasourceAPI,
      }) ?? [])
    );

    this._userMessages = userMessages;
  }

  private additionalUserMessages: Record<string, UserMessage> = {};

  // used to add warnings and errors from elsewhere in the embeddable
  private addUserMessages: AddUserMessages = (messages) => {
    const newMessageMap = {
      ...this.additionalUserMessages,
    };

    const addedMessageIds: string[] = [];
    messages.forEach((message) => {
      if (!newMessageMap[message.uniqueId]) {
        addedMessageIds.push(message.uniqueId);
        newMessageMap[message.uniqueId] = message;
      }
    });

    if (addedMessageIds.length) {
      this.additionalUserMessages = newMessageMap;
    }

    this.reload();

    return () => {
      const withMessagesRemoved = {
        ...this.additionalUserMessages,
      };

      messages.map(({ uniqueId }) => uniqueId).forEach((id) => delete withMessagesRemoved[id]);

      this.additionalUserMessages = withMessagesRemoved;
    };
  };

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

    const { ast, indexPatterns, indexPatternRefs } = await getExpressionFromDocument(
      this.savedVis,
      this.deps.documentToExpression
    );

    this.expression = ast;
    this.indexPatterns = indexPatterns;
    this.indexPatternRefs = indexPatternRefs;

    if (metaInfo?.sharingSavedObjectProps?.outcome === 'conflict' && !!this.deps.spaces) {
      this.addUserMessages([
        {
          uniqueId: 'url-conflict',
          severity: 'error',
          displayLocations: [{ id: 'visualization' }],
          shortMessage: i18n.translate('xpack.lens.embeddable.legacyURLConflict.shortMessage', {
            defaultMessage: `You've encountered a URL conflict`,
          }),
          longMessage: (
            <this.deps.spaces.ui.components.getEmbeddableLegacyUrlConflict
              targetType={DOC_TYPE}
              sourceId={metaInfo?.sharingSavedObjectProps?.sourceId!}
            />
          ),
          fixableInEditor: false,
        },
      ]);
    }

    await this.initializeOutput();

    // deferred loading of this embeddable is complete
    this.setInitializationFinished();

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

  private getSearchWarningMessages(adapters?: Partial<DefaultInspectorAdapters>): UserMessage[] {
    if (!this.activeDatasource || !this.activeDatasourceId || !adapters?.requests) {
      return [];
    }

    const docDatasourceState = this.savedVis?.state.datasourceStates[this.activeDatasourceId];

    const requestWarnings = getSearchWarningMessages(
      adapters.requests,
      this.activeDatasource,
      docDatasourceState,
      {
        searchService: this.deps.data.search,
      }
    );

    return requestWarnings;
  }

  private removeActiveDataWarningMessages: () => void = () => {};
  private updateActiveData: ExpressionWrapperProps['onData$'] = (data, adapters) => {
    if (this.input.onLoad) {
      // once onData$ is get's called from expression renderer, loading becomes false
      this.input.onLoad(false, adapters);
    }

    const { type, error } = data as { type: string; error: ErrorLike };
    this.updateOutput({
      loading: false,
      error: type === 'error' ? error : undefined,
    });

    const newActiveData = adapters?.tables?.tables;

    if (!fastIsEqual(this.activeData, newActiveData)) {
      // we check equality because this.addUserMessage triggers a render, so we get an infinite loop
      // if we just execute without checking if the data has changed
      this.removeActiveDataWarningMessages();
      const searchWarningMessages = this.getSearchWarningMessages(adapters);
      this.removeActiveDataWarningMessages = this.addUserMessages(
        searchWarningMessages.filter(isMessageRemovable)
      );
    }

    this.activeData = newActiveData;
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

    const errors = this.getUserMessages(['visualization', 'visualizationOnEmbeddable'], {
      severity: 'error',
    });

    this.updateOutput({
      loading: true,
      error: errors.length
        ? new Error(
            typeof errors[0].longMessage === 'string'
              ? errors[0].longMessage
              : errors[0].shortMessage
          )
        : undefined,
    });

    if (errors.length) {
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
          errors={errors}
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
          getCompatibleCellValueActions={this.getCompatibleCellValueActions}
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

    const warningsToDisplay = this.getUserMessages('embeddableBadge', {
      severity: 'warning',
    });

    if (warningsToDisplay.length && this.warningDomNode) {
      render(
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <Warnings warnings={warningsToDisplay.map((message) => message.longMessage)} compressed />
        </KibanaThemeProvider>,
        this.warningDomNode
      );
    }
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

  private readonly getCompatibleCellValueActions: GetCompatibleCellValueActions = async (data) => {
    const { getTriggerCompatibleActions } = this.deps;
    if (getTriggerCompatibleActions) {
      const embeddable = this;
      const actions: Array<Action<CellValueContext>> = (await getTriggerCompatibleActions(
        CELL_VALUE_TRIGGER,
        { data, embeddable }
      )) as Array<Action<CellValueContext>>;
      return actions
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        .map((action) => ({
          id: action.id,
          iconType: action.getIconType({ embeddable, data, trigger: cellValueTrigger })!,
          displayName: action.getDisplayName({ embeddable, data, trigger: cellValueTrigger }),
          execute: (cellData) =>
            action.execute({ embeddable, data: cellData, trigger: cellValueTrigger }),
        }));
    }
    return [];
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

      const { ast } = await getExpressionFromDocument(
        this.savedVis,
        this.deps.documentToExpression
      );

      this.expression = ast;

      this.loadUserMessages();
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
    if (
      !this.savedVis ||
      !this.activeData ||
      !this.activeDatasource ||
      !this.activeDatasourceState ||
      !this.activeVisualization ||
      !this.activeVisualizationState
    ) {
      return false;
    }

    const mergedSearchContext = this.getMergedSearchContext();

    if (!mergedSearchContext.timeRange) {
      return false;
    }

    const viewUnderlyingDataArgs = getViewUnderlyingDataArgs({
      activeDatasource: this.activeDatasource,
      activeDatasourceState: this.activeDatasourceState,
      activeVisualization: this.activeVisualization,
      activeVisualizationState: this.activeVisualizationState,
      activeData: this.activeData,
      dataViews: this.dataViews,
      capabilities: this.deps.capabilities,
      query: mergedSearchContext.query,
      filters: mergedSearchContext.filters || [],
      timeRange: mergedSearchContext.timeRange,
      esQueryConfig: getEsQueryConfig(this.deps.uiSettings),
      indexPatternsCache: this.indexPatterns,
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

    this.dataViews = uniqBy(indexPatterns, 'id');

    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();

    // if at least one indexPattern is time based, then the Lens embeddable requires the timeRange prop
    if (
      input.timeRange == null &&
      indexPatterns.some((indexPattern) => indexPattern.isTimeBased())
    ) {
      this.addUserMessages([
        {
          uniqueId: 'missing-time-range-on-embeddable',
          severity: 'error',
          fixableInEditor: false,
          displayLocations: [{ id: 'visualization' }],
          shortMessage: i18n.translate('xpack.lens.embeddable.missingTimeRangeParam.shortMessage', {
            defaultMessage: `Missing timeRange property`,
          }),
          longMessage: i18n.translate('xpack.lens.embeddable.missingTimeRangeParam.longMessage', {
            defaultMessage: `The timeRange property is required for the given configuration`,
          }),
        },
      ]);
    }

    if (this.hasAnyErrors) {
      this.logError('validation');
    }

    const title = input.hidePanelTitles ? '' : input.title ?? this.savedVis.title;
    const savedObjectId = (input as LensByReferenceInput).savedObjectId;
    this.updateOutput({
      defaultTitle: this.savedVis.title,
      editable: this.getIsEditable(),
      title,
      editPath: getEditPath(savedObjectId),
      editUrl: this.deps.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
      indexPatterns: this.dataViews,
    });
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
