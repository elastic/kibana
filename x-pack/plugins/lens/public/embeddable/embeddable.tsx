/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, uniqBy } from 'lodash';
import React from 'react';
import type { Observable } from 'rxjs';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  DataViewBase,
  EsQueryConfig,
  Filter,
  Query,
  AggregateQuery,
  TimeRange,
  isOfQueryType,
  getAggregateQueryMode,
  ExecutionContextSearch,
  getLanguageDisplayName,
} from '@kbn/es-query';
import type { PaletteOutput } from '@kbn/coloring';
import {
  DataPublicPluginStart,
  TimefilterContract,
  FilterManager,
  getEsQueryConfig,
  mapAndFlattenFilters,
} from '@kbn/data-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';

import { merge, Subscription, switchMap } from 'rxjs';
import { toExpression } from '@kbn/interpreter';
import {
  Datatable,
  DefaultInspectorAdapters,
  ErrorLike,
  RenderMode,
} from '@kbn/expressions-plugin/common';
import { map, distinctUntilChanged, skip, debounceTime } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';

import {
  EmbeddableStateTransfer,
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
  shouldFetch$,
} from '@kbn/embeddable-plugin/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import type {
  Capabilities,
  CoreStart,
  IBasePath,
  IUiSettingsClient,
  KibanaExecutionContext,
} from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiFontSize, useEuiTheme, EuiEmptyPrompt } from '@elastic/eui';
import { canTrackContentfulRender } from '@kbn/presentation-containers';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { getExecutionContextEvents, trackUiCounterEvents } from '../lens_ui_telemetry';
import { Document } from '../persistence';
import { ExpressionWrapper, ExpressionWrapperProps } from './expression_wrapper';
import {
  isLensBrushEvent,
  isLensFilterEvent,
  isLensMultiFilterEvent,
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
  FramePublicAPI,
  AddUserMessages,
  UserMessagesGetter,
  UserMessagesDisplayLocationId,
} from '../types';

import type {
  AllowedChartOverrides,
  AllowedPartitionOverrides,
  AllowedSettingsOverrides,
  AllowedGaugeOverrides,
  AllowedXYOverrides,
} from '../../common/types';
import { getEditPath, DOC_TYPE, APP_ID } from '../../common/constants';
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
  extractReferencesFromState,
} from '../utils';
import { getLayerMetaInfo, combineQueryAndFilters } from '../app_plugin/show_underlying_data';
import {
  filterAndSortUserMessages,
  getApplicationUserMessages,
} from '../app_plugin/get_application_user_messages';
import { MessageList } from '../editor_frame_service/editor_frame/workspace_panel/message_list';
import type { DocumentToExpressionReturnType } from '../editor_frame_service/editor_frame';
import type { TypedLensByValueInput } from './embeddable_component';
import type { LensPluginStartDependencies } from '../plugin';
import { EmbeddableFeatureBadge } from './embeddable_info_badges';
import { getDatasourceLayers } from '../state_management/utils';
import type { EditLensConfigurationProps } from '../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { TextBasedPersistedState } from '../datasources/text_based/types';

export type LensSavedObjectAttributes = Omit<Document, 'savedObjectId' | 'type'>;

export interface LensUnwrapMetaInfo {
  sharingSavedObjectProps?: SharingSavedObjectProps;
  managed?: boolean;
}

export interface LensUnwrapResult {
  attributes: LensSavedObjectAttributes;
  metaInfo?: LensUnwrapMetaInfo;
}

interface PreventableEvent {
  preventDefault(): void;
}

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export interface LensBaseEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  palette?: PaletteOutput;
  renderMode?: RenderMode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (
    isLoading: boolean,
    adapters?: Partial<DefaultInspectorAdapters>,
    output$?: Observable<LensEmbeddableOutput>
  ) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
  abortController?: AbortController;
  onBeforeBadgesRender?: (userMessages: UserMessage[]) => UserMessage[];
}

export type LensByValueInput = {
  attributes: LensSavedObjectAttributes;
  /**
   * Overrides can tweak the style of the final embeddable and are executed at the end of the Lens rendering pipeline.
   * Each visualization type offers various type of overrides, per component (i.e. 'setting', 'axisX', 'partition', etc...)
   *
   * While it is not possible to pass function/callback/handlers to the renderer, it is possible to overwrite
   * the current behaviour by passing the "ignore" string to the override prop (i.e. onBrushEnd: "ignore" to stop brushing)
   */
  overrides?:
    | AllowedChartOverrides
    | AllowedSettingsOverrides
    | AllowedXYOverrides
    | AllowedPartitionOverrides
    | AllowedGaugeOverrides;
} & LensBaseEmbeddableInput;

export type LensByReferenceInput = SavedObjectEmbeddableInput & LensBaseEmbeddableInput;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: DataView[];
}

export interface LensEmbeddableDeps {
  attributeService: LensAttributeService;
  data: DataPublicPluginStart;
  documentToExpression: (doc: Document) => Promise<DocumentToExpressionReturnType>;
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
    canOpenVisualizations: boolean;
    canSaveDashboards: boolean;
    navLinks: Capabilities['navLinks'];
    discover: Capabilities['discover'];
  };
  coreStart: CoreStart;
  usageCollection?: UsageCollectionSetup;
  spaces?: SpacesPluginStart;
  uiSettings: IUiSettingsClient;
}

export interface ViewUnderlyingDataArgs {
  dataViewSpec: DataViewSpec;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  columns: string[];
}

function VisualizationErrorPanel({ errors, canEdit }: { errors: UserMessage[]; canEdit: boolean }) {
  const showMore = errors.length > 1;
  const canFixInLens = canEdit && errors.some(({ fixableInEditor }) => fixableInEditor);
  return (
    <div className="lnsEmbeddedError">
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        data-test-subj="embeddable-lens-failure"
        body={
          <>
            {errors.length ? (
              <>
                <p>{errors[0].longMessage as React.ReactNode}</p>
                {showMore && !canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.embeddable.moreErrors"
                      defaultMessage="Edit in Lens editor to see more errors"
                    />
                  </p>
                ) : null}
                {canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.embeddable.fixErrors"
                      defaultMessage="Edit in Lens editor to fix the error"
                    />
                  </p>
                ) : null}
              </>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.lens.embeddable.failure"
                  defaultMessage="Visualization couldn't be displayed"
                />
              </p>
            )}
          </>
        }
      />
    </div>
  );
}

const getExpressionFromDocument = async (
  document: Document,
  documentToExpression: LensEmbeddableDeps['documentToExpression']
) => {
  const { ast, indexPatterns, indexPatternRefs, activeVisualizationState } =
    await documentToExpression(document);
  return {
    ast: ast ? toExpression(ast) : null,
    indexPatterns,
    indexPatternRefs,
    activeVisualizationState,
  };
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

const EmbeddableMessagesPopover = ({ messages }: { messages: UserMessage[] }) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  if (!messages.length) {
    return null;
  }

  return (
    <MessageList
      messages={messages}
      customButtonStyles={css`
        block-size: ${euiTheme.size.l};
        font-size: ${xsFontSize};
        padding: 0 ${euiTheme.size.xs};
        & > * {
          gap: ${euiTheme.size.xs};
        }
      `}
    />
  );
};

const blockingMessageDisplayLocations: UserMessagesDisplayLocationId[] = [
  'visualization',
  'visualizationOnEmbeddable',
];

const MessagesBadge = ({ onMount }: { onMount: (el: HTMLDivElement) => void }) => (
  <div
    css={css({
      position: 'absolute',
      zIndex: 2,
      left: 0,
      bottom: 0,
    })}
    ref={(el) => {
      if (el) {
        onMount(el);
      }
    }}
  />
);

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
  private isInitialized = false;
  private inputReloadSubscriptions: Subscription[];
  private isDestroyed?: boolean;
  private lensInspector: LensInspector;

  private logError(type: 'runtime' | 'validation') {
    trackUiCounterEvents(
      type === 'runtime' ? 'embeddable_runtime_error' : 'embeddable_validation_error',
      this.getExecutionContext()
    );
  }

  private activeData?: TableInspectorAdapter;

  private internalDataViews: DataView[] = [];

  private viewUnderlyingDataArgs?: ViewUnderlyingDataArgs;

  private activeVisualizationState?: unknown;

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
    this.initializeSavedVis(initialInput)
      .then(() => {
        this.reload();
      })
      .catch((e) => this.onFatalError(e));

    const input$ = this.getInput$();

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
        .subscribe((_input) => {
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
        .subscribe((_input) => {
          // only reload if drilldowns are set
          if (this.getInput().enhancements?.dynamicActions) {
            this.reload();
          }
        })
    );

    // Use a trigger to distinguish between observables in the subscription
    const withTrigger = (trigger: 'attributesOrSavedObjectId' | 'searchContext') =>
      map((input: LensEmbeddableInput) => ({ trigger, input }));

    // Re-initialize the visualization if either the attributes or the saved object id changes
    const attributesOrSavedObjectId$ = input$.pipe(
      distinctUntilChanged((a, b) =>
        fastIsEqual(
          [
            'attributes' in a && a.attributes,
            'savedObjectId' in a && a.savedObjectId,
            'overrides' in a && a.overrides,
            'disableTriggers' in a && a.disableTriggers,
          ],
          [
            'attributes' in b && b.attributes,
            'savedObjectId' in b && b.savedObjectId,
            'overrides' in b && b.overrides,
            'disableTriggers' in b && b.disableTriggers,
          ]
        )
      ),
      skip(1),
      withTrigger('attributesOrSavedObjectId')
    );

    // Update search context and reload on changes related to search
    const searchContext$ = shouldFetch$<LensEmbeddableInput>(input$, () => this.getInput()).pipe(
      withTrigger('searchContext')
    );

    // Merge and debounce the observables to avoid multiple reloads
    this.inputReloadSubscriptions.push(
      merge(searchContext$, attributesOrSavedObjectId$)
        .pipe(
          debounceTime(0),
          switchMap(async ({ trigger, input }) => {
            if (trigger === 'attributesOrSavedObjectId') {
              await this.initializeSavedVis(input);
            }

            // reset removable messages
            // Dashboard search/context changes are detected here
            this.additionalUserMessages = {};

            this.reload();
          })
        )
        .subscribe()
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

  private indexPatterns: IndexPatternMap = {};

  private indexPatternRefs: IndexPatternRef[] = [];

  // TODO - consider getting this from the persistedStateToExpression function
  // where it is already computed
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

  private fullAttributes: LensSavedObjectAttributes | undefined;

  private handleExternalUserMessage = (messages: UserMessage[]) => {
    if (this.input.onBeforeBadgesRender) {
      // we need something else to better identify those errors
      const [messagesToHandle, originalMessages] = partition(messages, (message) =>
        message.displayLocations.some((location) => location.id === 'embeddableBadge')
      );

      if (messagesToHandle.length > 0) {
        const customBadgeMessages = this.input.onBeforeBadgesRender(messagesToHandle);
        return [...originalMessages, ...customBadgeMessages];
      }
    }

    return messages;
  };

  public getUserMessages: UserMessagesGetter = (locationId, filters) => {
    const userMessages: UserMessage[] = [];
    userMessages.push(
      ...getApplicationUserMessages({
        visualizationType: this.savedVis?.visualizationType,
        visualizationState: {
          state: this.activeVisualizationState,
          activeId: this.activeVisualizationId,
        },
        visualization:
          this.activeVisualizationId && this.deps.visualizationMap[this.activeVisualizationId]
            ? this.deps.visualizationMap[this.activeVisualizationId]
            : undefined,
        activeDatasource: this.activeDatasource,
        activeDatasourceState: {
          isLoading: !this.activeDatasourceState,
          state: this.activeDatasourceState,
        },
        dataViews: {
          indexPatterns: this.indexPatterns,
          indexPatternRefs: this.indexPatternRefs, // TODO - are these actually used?
        },
        core: this.deps.coreStart,
      })
    );

    if (!this.savedVis) {
      return this.handleExternalUserMessage(userMessages);
    }

    const mergedSearchContext = this.getMergedSearchContext();

    const framePublicAPI: FramePublicAPI = {
      dataViews: {
        indexPatterns: this.indexPatterns,
        indexPatternRefs: this.indexPatternRefs,
      },
      datasourceLayers: getDatasourceLayers(
        {
          [this.activeDatasourceId!]: {
            isLoading: !this.activeDatasourceState,
            state: this.activeDatasourceState,
          },
        },
        this.deps.datasourceMap,
        this.indexPatterns
      ),
      query: this.savedVis.state.query,
      filters: mergedSearchContext.filters ?? [],
      dateRange: {
        fromDate: mergedSearchContext.timeRange?.from ?? '',
        toDate: mergedSearchContext.timeRange?.to ?? '',
      },
      absDateRange: {
        fromDate: mergedSearchContext.timeRange?.from ?? '',
        toDate: mergedSearchContext.timeRange?.to ?? '',
      },
      activeData: this.activeData,
    };

    userMessages.push(
      ...(this.activeDatasource?.getUserMessages(this.activeDatasourceState, {
        setState: () => {},
        frame: framePublicAPI,
        visualizationInfo: this.activeVisualization?.getVisualizationInfo?.(
          this.activeVisualizationState,
          framePublicAPI
        ),
      }) ?? []),
      ...(this.activeVisualization?.getUserMessages?.(this.activeVisualizationState, {
        frame: framePublicAPI,
      }) ?? [])
    );

    return this.handleExternalUserMessage(
      filterAndSortUserMessages(
        [...userMessages, ...Object.values(this.additionalUserMessages)],
        locationId,
        filters ?? {}
      )
    );
  };

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
      this.renderUserMessages();
    }

    return () => {
      messages.forEach(({ uniqueId }) => {
        delete this.additionalUserMessages[uniqueId];
      });
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

  public getFullAttributes() {
    return this.fullAttributes;
  }

  public isTextBasedLanguage() {
    if (!this.savedVis) {
      return;
    }
    const query = this.savedVis.state.query;
    return !isOfQueryType(query);
  }

  public getTextBasedLanguage(): string | undefined {
    if (!this.isTextBasedLanguage() || !this.savedVis?.state.query) {
      return;
    }
    const query = this.savedVis?.state.query as unknown as AggregateQuery;
    const language = getAggregateQueryMode(query);
    return getLanguageDisplayName(language).toUpperCase();
  }

  /**
   * Gets the Lens embeddable's datasource and visualization states
   * updates the embeddable input
   */
  async updateVisualization(
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) {
    const viz = this.savedVis;
    const activeDatasourceId = (this.activeDatasourceId ??
      'formBased') as EditLensConfigurationProps['datasourceId'];
    if (viz?.state) {
      const datasourceStates = {
        ...viz.state.datasourceStates,
        [activeDatasourceId]: datasourceState,
      };
      const references =
        activeDatasourceId === 'formBased'
          ? extractReferencesFromState({
              activeDatasources: Object.keys(datasourceStates).reduce(
                (acc, datasourceId) => ({
                  ...acc,
                  [datasourceId]: this.deps.datasourceMap[datasourceId],
                }),
                {}
              ),
              datasourceStates: Object.fromEntries(
                Object.entries(datasourceStates).map(([id, state]) => [
                  id,
                  { isLoading: false, state },
                ])
              ),
              visualizationState,
              activeVisualization: this.activeVisualizationId
                ? this.deps.visualizationMap[visualizationType ?? this.activeVisualizationId]
                : undefined,
            })
          : [];
      const attrs = {
        ...viz,
        state: {
          ...viz.state,
          visualization: visualizationState,
          datasourceStates,
        },
        references,
        visualizationType: visualizationType ?? viz.visualizationType,
      };

      /**
       * SavedObjectId is undefined for by value panels and defined for the by reference ones.
       * Here we are converting the by reference panels to by value when user is inline editing
       */
      this.updateInput({ attributes: attrs, savedObjectId: undefined });
      /**
       * Should load again the user messages,
       * otherwise the embeddable state is stuck in an error state
       */
      this.renderUserMessages();
    }
  }

  async updateSuggestion(attrs: LensSavedObjectAttributes) {
    const viz = this.savedVis;
    const newViz = {
      ...viz,
      ...attrs,
    };
    this.updateInput({ attributes: newViz });
  }

  /**
   * Callback which allows the navigation to the editor.
   * Used for the Edit in Lens link inside the inline editing flyout.
   */
  private async navigateToLensEditor() {
    const appContext = this.getAppContext();
    /**
     * The origininating app variable is very important for the Save and Return button
     * of the editor to work properly.
     */
    const transferState = {
      originatingApp: appContext?.currentAppId ?? 'dashboards',
      originatingPath: appContext?.getCurrentPath?.(),
      valueInput: this.getExplicitInput(),
      embeddableId: this.id,
      searchSessionId: this.getInput().searchSessionId,
    };
    const transfer = new EmbeddableStateTransfer(
      this.deps.coreStart.application.navigateToApp,
      this.deps.coreStart.application.currentAppId$
    );
    if (transfer) {
      await transfer.navigateToEditor(APP_ID, {
        path: this.output.editPath,
        state: transferState,
        skipAppLeave: true,
      });
    }
  }

  public updateByRefInput(savedObjectId: string) {
    const attrs = this.savedVis;
    this.updateInput({ attributes: attrs, savedObjectId });
  }

  async openConfigPanel(
    startDependencies: LensPluginStartDependencies,
    isNewPanel?: boolean,
    deletePanel?: () => void
  ) {
    const { getEditLensConfiguration } = await import('../async_services');
    const Component = await getEditLensConfiguration(
      this.deps.coreStart,
      startDependencies,
      this.deps.visualizationMap,
      this.deps.datasourceMap
    );

    const datasourceId = (this.activeDatasourceId ??
      'formBased') as EditLensConfigurationProps['datasourceId'];

    const attributes = this.savedVis as TypedLensByValueInput['attributes'];
    if (attributes) {
      return (
        <Component
          attributes={attributes}
          updatePanelState={this.updateVisualization.bind(this)}
          updateSuggestion={this.updateSuggestion.bind(this)}
          datasourceId={datasourceId}
          lensAdapters={this.lensInspector.adapters}
          output$={this.getOutput$()}
          panelId={this.id}
          savedObjectId={this.savedVis?.savedObjectId}
          updateByRefInput={this.updateByRefInput.bind(this)}
          navigateToLensEditor={
            !this.isTextBasedLanguage() ? this.navigateToLensEditor.bind(this) : undefined
          }
          displayFlyoutHeader
          canEditTextBasedQuery={this.isTextBasedLanguage()}
          isNewPanel={isNewPanel}
          deletePanel={deletePanel}
        />
      );
    }
    return null;
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
    this.fullAttributes = attributes;
    this.savedVis = {
      ...attributes,
      type: this.type,
      savedObjectId: (input as LensByReferenceInput)?.savedObjectId,
    };

    if (this.isTextBasedLanguage()) {
      this.updateInput({
        disabledActions: ['OPEN_FLYOUT_ADD_DRILLDOWN'],
      });
    }

    try {
      const { ast, indexPatterns, indexPatternRefs, activeVisualizationState } =
        await getExpressionFromDocument(this.savedVis, this.deps.documentToExpression);

      this.expression = ast;
      this.indexPatterns = indexPatterns;
      this.indexPatternRefs = indexPatternRefs;
      this.activeVisualizationState = activeVisualizationState;
    } catch {
      // nothing, errors should be reported via getUserMessages
    }

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
      this.input.onLoad(false, adapters, this.getOutput$());
    }

    const { type, error } = data as { type: string; error: ErrorLike };
    this.updateOutput({
      loading: false,
      error: type === 'error' ? error : undefined,
    });

    const newActiveData = adapters?.tables?.tables;

    this.removeActiveDataWarningMessages();
    const searchWarningMessages = this.getSearchWarningMessages(adapters);
    this.removeActiveDataWarningMessages = this.addUserMessages(searchWarningMessages);

    this.activeData = newActiveData;

    this.renderUserMessages();
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
    this.trackContentfulRender();

    this.renderComplete.dispatchComplete();
    this.updateOutput({
      ...this.getOutput(),
      rendered: true,
    });

    const inspectorAdapters = this.getInspectorAdapters();
    const requests = inspectorAdapters.requests?.getRequests() || [];

    let totalTookTime = 0;
    let allValid = true;
    let totalTime = 0;
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      if (request.status !== RequestStatus.OK) {
        allValid = false;
        break;
      }
      totalTookTime +=
        (request.response?.json as { rawResponse: estypes.SearchResponse | undefined } | undefined)
          ?.rawResponse?.took ?? 0;
      totalTime += request.time || 0;
    }

    if (allValid) {
      const esRequestMetrics = {
        eventName: 'lens_chart_es_request_totals',
        duration: totalTime,
        key1: 'es_took_total',
        value1: totalTookTime,
      };
      reportPerformanceMetricEvent(this.deps.coreStart.analytics, esRequestMetrics);
    }
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

    const blockingErrors = this.getUserMessages(blockingMessageDisplayLocations, {
      severity: 'error',
    });

    this.updateOutput({
      loading: true,
      error: blockingErrors.length
        ? new Error(
            typeof blockingErrors[0].longMessage === 'string'
              ? blockingErrors[0].longMessage
              : blockingErrors[0].shortMessage
          )
        : undefined,
    });

    if (blockingErrors.length) {
      this.renderComplete.dispatchError();
    } else {
      this.renderComplete.dispatchInProgress();
    }

    const input = this.getInput();

    const getInternalTables = (states: Record<string, unknown>) => {
      const result: Record<string, Datatable> = {};
      if ('textBased' in states) {
        const layers = (states.textBased as TextBasedPersistedState).layers;
        for (const layer in layers) {
          if (layers[layer] && layers[layer].table) {
            result[layer] = layers[layer].table!;
          }
        }
      }
      return result;
    };

    if (this.expression && !blockingErrors.length) {
      render(
        <>
          <KibanaRenderContextProvider {...this.deps.coreStart}>
            <ExpressionWrapper
              ExpressionRenderer={this.expressionRenderer}
              expression={this.expression || null}
              lensInspector={this.lensInspector}
              searchContext={this.getMergedSearchContext()}
              variables={{
                embeddableTitle: this.getTitle(),
                ...(input.palette ? { theme: { palette: input.palette } } : {}),
                ...('overrides' in input ? { overrides: input.overrides } : {}),
                ...getInternalTables(this.savedVis.state.datasourceStates),
              }}
              searchSessionId={this.getInput().searchSessionId}
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
              abortController={this.input.abortController}
              addUserMessages={(messages) => this.addUserMessages(messages)}
              onRuntimeError={(error) => {
                this.updateOutput({ error });
                this.logError('runtime');
              }}
              noPadding={this.visDisplayOptions.noPadding}
            />
          </KibanaRenderContextProvider>
          <MessagesBadge
            onMount={(el) => {
              this.badgeDomNode = el;
              this.renderBadgeMessages();
            }}
          />
        </>,
        domNode
      );
    }

    this.renderUserMessages();
  }

  private trackContentfulRender() {
    if (!this.activeData || !canTrackContentfulRender(this.parent)) {
      return;
    }

    const hasData = Object.values(this.activeData).some((table) => {
      if (table.meta?.statistics?.totalCount != null) {
        // if totalCount is set, refer to total count
        return table.meta.statistics.totalCount > 0;
      }
      // if not, fall back to check the rows of the table
      return table.rows.length > 0;
    });

    if (hasData) {
      this.parent.trackContentfulRender();
    }
  }

  private renderUserMessages() {
    const errors = this.getUserMessages(['visualization', 'visualizationOnEmbeddable'], {
      severity: 'error',
    });

    if (errors.length && this.domNode) {
      render(
        <>
          <KibanaRenderContextProvider {...this.deps.coreStart}>
            <VisualizationErrorPanel
              errors={errors}
              canEdit={this.getIsEditable() && this.input.viewMode === 'edit'}
            />
          </KibanaRenderContextProvider>
          <MessagesBadge
            onMount={(el) => {
              this.badgeDomNode = el;
              this.renderBadgeMessages();
            }}
          />
        </>,
        this.domNode
      );
    }

    this.renderBadgeMessages();
  }

  badgeDomNode?: HTMLDivElement;

  /**
   * This method is called on every render, and also whenever the badges dom node is created
   * That happens after either the expression renderer or the visualization error panel is rendered.
   *
   * You should not call this method on its own. Use renderUserMessages instead.
   */
  private renderBadgeMessages = () => {
    const messages = this.getUserMessages('embeddableBadge');
    const [warningOrErrorMessages, infoMessages] = partition(
      messages,
      ({ severity }) => severity !== 'info'
    );

    if (this.badgeDomNode) {
      render(
        <KibanaRenderContextProvider {...this.deps.coreStart}>
          <EmbeddableMessagesPopover messages={warningOrErrorMessages} />
          <EmbeddableFeatureBadge messages={infoMessages} />
        </KibanaRenderContextProvider>,
        this.badgeDomNode
      );
    }
  };

  private readonly hasCompatibleActions = async (
    event: ExpressionRendererEvent
  ): Promise<boolean> => {
    if (
      isLensTableRowContextMenuClickEvent(event) ||
      isLensMultiFilterEvent(event) ||
      isLensFilterEvent(event)
    ) {
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
          type: action.type,
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

    const input = this.getInput();
    const context: ExecutionContextSearch = {
      now: this.deps.data.nowProvider.get().getTime(),
      timeRange:
        input.timeslice !== undefined
          ? {
              from: new Date(input.timeslice[0]).toISOString(),
              to: new Date(input.timeslice[1]).toISOString(),
              mode: 'absolute' as 'absolute',
            }
          : input.timeRange,
      query: [this.savedVis.state.query],
      filters: this.deps.injectFilterReferences(
        this.savedVis.state.filters,
        this.savedVis.references
      ),
      disableWarningToasts: true,
    };

    if (input.query) {
      context.query = [input.query, ...(context.query as Query[])];
    }

    if (input.filters?.length) {
      context.filters = [
        ...input.filters.filter((filter) => !filter.meta.disabled),
        ...(context.filters as Filter[]),
      ];
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

    let eventHandler:
      | LensBaseEmbeddableInput['onBrushEnd']
      | LensBaseEmbeddableInput['onFilter']
      | LensBaseEmbeddableInput['onTableRowClick'];
    let shouldExecuteDefaultTriggers = true;

    if (isLensBrushEvent(event)) {
      eventHandler = this.input.onBrushEnd;
    } else if (isLensFilterEvent(event) || isLensMultiFilterEvent(event)) {
      eventHandler = this.input.onFilter;
    } else if (isLensTableRowContextMenuClickEvent(event)) {
      eventHandler = this.input.onTableRowClick;
    }
    const esqlQuery = this.isTextBasedLanguage() ? this.savedVis?.state.query : undefined;

    eventHandler?.({
      ...event.data,
      preventDefault: () => {
        shouldExecuteDefaultTriggers = false;
      },
    });

    if (isLensFilterEvent(event) || isLensMultiFilterEvent(event) || isLensBrushEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: {
            ...event.data,
            timeFieldName:
              event.data.timeFieldName || inferTimeField(this.deps.data.datatableUtilities, event),
            query: esqlQuery,
          },
          embeddable: this,
        });
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec(
          {
            data: event.data,
            embeddable: this,
          },
          true
        );
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

      this.reload();
    }
  };

  reload() {
    if (!this.savedVis || !this.isInitialized || this.isDestroyed) {
      return;
    }

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
      dataViews: this.internalDataViews,
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

    this.internalDataViews = uniqBy(indexPatterns, 'id');

    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();

    // if at least one indexPattern is time based, then the Lens embeddable requires the timeRange prop
    // this is necessary for the dataview embeddable but not the ES|QL one
    if (
      !Boolean(this.isTextBasedLanguage()) &&
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

    const blockingErrors = this.getUserMessages(blockingMessageDisplayLocations, {
      severity: 'error',
    });
    if (blockingErrors.length) {
      this.logError('validation');
    }

    const title = input.hidePanelTitles ? '' : input.title ?? this.savedVis.title;
    const description = input.hidePanelTitles ? '' : input.description ?? this.savedVis.description;
    const savedObjectId = (input as LensByReferenceInput).savedObjectId;
    this.updateOutput({
      defaultTitle: this.savedVis.title,
      defaultDescription: this.savedVis.description,
      /** lens visualizations allow inline editing action
       *  navigation to the editor is allowed through the flyout
       */
      editable: this.getIsEditable(),
      inlineEditable: true,
      title,
      description,
      editPath: getEditPath(savedObjectId),
      editUrl: this.deps.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
      indexPatterns: this.internalDataViews,
    });
  }

  public getIsEditable() {
    // for ES|QL, editing is allowed only if the advanced setting is on
    if (Boolean(this.isTextBasedLanguage()) && !this.deps.uiSettings.get(ENABLE_ESQL)) {
      return false;
    }
    return (
      this.deps.capabilities.canSaveVisualizations ||
      (!this.inputIsRefType(this.getInput()) &&
        this.deps.capabilities.canSaveDashboards &&
        this.deps.capabilities.canOpenVisualizations)
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

  /**
   * Gets the Lens embeddable's local filters
   * @returns Local/panel-level array of filters for Lens embeddable
   */
  public getFilters() {
    try {
      return mapAndFlattenFilters(
        this.deps.injectFilterReferences(
          this.savedVis?.state.filters ?? [],
          this.savedVis?.references ?? []
        )
      );
    } catch (e) {
      // if we can't parse the filters, we publish an empty array.
      return [];
    }
  }

  /**
   * Gets the Lens embeddable's local query
   * @returns Local/panel-level query for Lens embeddable
   */
  public getQuery() {
    return this.savedVis?.state.query;
  }

  public getSavedVis(): Readonly<LensSavedObjectAttributes | undefined> {
    if (!this.savedVis) {
      return;
    }

    // Why are 'type' and 'savedObjectId' keys being removed?
    // Prior to removing them,
    // this method returned 'Readonly<Document | undefined>' while consumers typed the results as 'LensSavedObjectAttributes'.
    // Removing 'type' and 'savedObjectId' keys to align method results with consumer typing.
    const savedVis = { ...this.savedVis };
    delete savedVis.type;
    delete savedVis.savedObjectId;
    return savedVis;
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
