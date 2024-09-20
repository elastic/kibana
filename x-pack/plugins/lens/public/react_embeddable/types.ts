/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { AggregateQuery, ExecutionContextSearch, Filter, Query, TimeRange } from '@kbn/es-query';
import { Adapters, InspectorOptions } from '@kbn/inspector-plugin/public';
import {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasParentApi,
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesUnifiedSearch,
  SerializedTitles,
  StateComparators,
  ViewMode,
} from '@kbn/presentation-publishing';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { PaletteOutput } from '@kbn/coloring';
import { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import {
  Capabilities,
  CoreStart,
  HttpSetup,
  IUiSettingsClient,
  KibanaExecutionContext,
  OverlayRef,
  ThemeServiceStart,
} from '@kbn/core/public';
import { TimefilterContract, FilterManager } from '@kbn/data-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import { RecursiveReadonly } from '@kbn/utility-types';
import { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
import { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
import { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
import { Action } from '@kbn/ui-actions-plugin/public';
import { LegacyMetricState } from '../../common';
import { LensDocument } from '../persistence';
import { LensInspector } from '../lens_inspector_service';
import { LensAttributesService } from '../lens_attribute_service';
import {
  DatatableVisualizationState,
  DocumentToExpressionReturnType,
  HeatmapVisualizationState,
  XYState,
} from '../async_services';
import {
  AddUserMessages,
  Datasource,
  DatasourceMap,
  IndexPatternMap,
  IndexPatternRef,
  LensTableRowContextMenuEvent,
  Simplify,
  UserMessage,
  Visualization,
  VisualizationMap,
} from '../types';
import { LensPluginStartDependencies } from '../plugin';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { PieVisualizationState } from '../../common/types';
import { FormBasedPersistedState } from '..';
import { TextBasedPersistedState } from '../datasources/text_based/types';
import { GaugeVisualizationState } from '../visualizations/gauge/constants';
import { MetricVisualizationState } from '../visualizations/metric/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LensApiProps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LensStateProps {}

export interface LensInitType<Api extends LensApiProps = {}, Props extends LensStateProps = {}> {
  api: Api;
  comparators: StateComparators<Props>;
  serialize: () => Props;
  cleanup: () => void;
}

export type LensSavedObjectAttributes = Omit<LensDocument, 'savedObjectId' | 'type'>;

export interface VisualizationContext {
  doc: LensDocument | undefined;
  mergedSearchContext: ExecutionContextSearch;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
  activeVisualization: Visualization | undefined;
  activeVisualizationState: unknown;
  activeDatasource: Datasource | undefined;
  activeDatasourceState: unknown;
  activeData?: TableInspectorAdapter;
}

export interface VisualizationContextHelper {
  getVisualizationContext: () => VisualizationContext;
  updateVisualizationContext: (newContext: Partial<VisualizationContext>) => void;
}

export interface ViewUnderlyingDataArgs {
  dataViewSpec: DataViewSpec;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  columns: string[];
}

export type LensEmbeddableStartServices = Simplify<
  LensPluginStartDependencies & {
    timefilter: TimefilterContract;
    coreHttp: HttpSetup;
    coreStart: CoreStart;
    capabilities: RecursiveReadonly<Capabilities>;
    expressionRenderer: ReactExpressionRendererType;
    documentToExpression: (doc: LensDocument) => Promise<DocumentToExpressionReturnType>;
    injectFilterReferences: FilterManager['inject'];
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
    theme: ThemeServiceStart;
    uiSettings: IUiSettingsClient;
    attributeService: LensAttributesService;
  }
>;

export interface PreventableEvent {
  preventDefault(): void;
}

interface LensByValue {
  // by-value
  attributes?: Simplify<LensSavedObjectAttributes>;
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
}

/**
 * Lens embeddable props broken down by type
 */

interface LensByReference {
  // by-reference
  savedObjectId?: string;
}

type LensPropsVariants = LensByValue & LensByReference;

interface ViewInDiscoverCallbacks extends LensApiProps {
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs | undefined;
}

interface IntegrationCallbacks extends LensApiProps {
  isTextBasedLanguage: () => boolean | undefined;
  getTextBasedLanguage: () => string | undefined;
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
  getFullAttributes: () => LensDocument | undefined;
  updateState: (newState: LensRuntimeState) => void;
}

export interface LensPublicCallbacks extends LensApiProps {
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (isLoading: boolean, adapters?: Partial<DefaultInspectorAdapters>) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
  /**
   * Let the consumer overwrite embeddable user messages
   */
  onBeforeBadgesRender?: (userMessages: UserMessage[]) => UserMessage[];
}

export type LensApiCallbacks = Simplify<ViewInDiscoverCallbacks & IntegrationCallbacks>;

export interface LensUnifiedSearchContext {
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  searchSessionId?: string;
}

type LensKibanaContextProps = LensUnifiedSearchContext & {
  palette?: PaletteOutput;
};

interface LensPanelProps {
  id?: string;
  renderMode?: ViewMode;
  disableTriggers?: boolean;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
}

interface LensRequestHandlersProps {
  /**
   * Custom abort controller to be used for the ES client
   */
  abortController?: AbortController;
}

/**
 * Compose together all the props and make them inspectable via Simplify
 *
 * The LensSerializedState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensSerializedState = Simplify<
  LensPropsVariants &
    LensKibanaContextProps &
    LensPanelProps &
    SerializedTitles &
    Partial<DynamicActionsSerializedState>
>;

/**
 * Custom props exposed on the Lens exported component
 */
export type LensComponentProps = Simplify<
  LensRequestHandlersProps &
    LensStateProps & {
      /**
       * When enabled the Lens component will render as a dashboard panel
       */
      withDefaultActions?: boolean;
      /**
       * Allow custom actions to be rendered in the panel
       */
      extraActions?: Action[];
      /**
       * Disable specific actions for the embeddable
       */
      disabledActions?: string[];
      /**
       * Toggles the inspector
       */
      showInspector?: boolean;

      executionContext?: KibanaExecutionContext;
      style?: React.CSSProperties;
      className?: string;
      noPadding?: boolean;
      viewMode?: ViewMode;
    }
>;

/**
 * This is the subset of props that from the LensComponent will be forwarded to the Lens embeddable
 */
export type LensComponentForwardedProps = Pick<
  LensComponentProps,
  'style' | 'className' | 'noPadding' | 'viewMode' | 'abortController' | 'executionContext'
>;

/**
 * Carefully chosen props to expose on the Lens renderer component used by
 * other plugins
 */

type ComponentProps = LensComponentProps & LensPublicCallbacks;
type ComponentSerializedProps = TypedLensSerializedState;

type LensRendererPrivateProps = ComponentSerializedProps & ComponentProps;
export type LensRendererProps = Simplify<LensRendererPrivateProps>;

/**
 * The LensRuntimeState is the state stored for a dashboard panel
 * that contains:
 * * Lens document state
 * * Panel settings
 * * other props from the embeddable
 */
export type LensRuntimeState = Simplify<
  Omit<ComponentSerializedProps, 'attributes'> & {
    attributes: NonNullable<LensSerializedState['attributes']>;
  } & LensComponentForwardedProps
>;

export interface LensInspectorAdapters {
  getInspectorAdapters: () => Adapters;
  inspect: (options?: InspectorOptions) => OverlayRef;
  closeInspector: () => Promise<void>;
}

export type LensApi = Simplify<
  DefaultEmbeddableApi<LensRuntimeState> &
    Partial<HasEditCapabilities> &
    LensInspectorAdapters &
    PublishesUnifiedSearch &
    HasSupportedTriggers &
    LensRequestHandlersProps &
    HasLibraryTransforms &
    PublishesDataLoading &
    Partial<HasParentApi<unknown>> &
    LensApiCallbacks
>;

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  interactive?: boolean;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: (
    data: unknown,
    inspectorAdapters?: Partial<DefaultInspectorAdapters> | undefined
  ) => void;
  onRender$: () => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  getCompatibleCellValueActions?: ReactExpressionRendererProps['getCompatibleCellValueActions'];
  style?: React.CSSProperties;
  className?: string;
  addUserMessages: AddUserMessages;
  onRuntimeError: (error: Error) => void;
  executionContext?: KibanaExecutionContext;
  lensInspector: LensInspector;
  noPadding?: boolean;
  abortController?: AbortController;
}

export type GetStateType = () => LensRuntimeState;

/**
 * Custom Lens component exported by the plugin
 * For better DX of Lens component consumers, expose a typed version of the serialized state
 */

/** Utility function to build typed version for each chart */
type TypedLensAttributes<TVisType, TVisState> = Simplify<
  Omit<LensDocument, 'savedObjectId' | 'type' | 'state' | 'visualizationType'> & {
    visualizationType: TVisType;
    state: Simplify<
      Omit<LensDocument['state'], 'datasourceStates' | 'visualization'> & {
        datasourceStates: {
          formBased?: FormBasedPersistedState;
          textBased?: TextBasedPersistedState;
        };
        visualization: TVisState;
      }
    >;
  }
>;

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensSerializedState = Simplify<
  Omit<LensSerializedState, 'attributes'> & {
    attributes:
      | TypedLensAttributes<'lnsXY', XYState>
      | TypedLensAttributes<'lnsPie', PieVisualizationState>
      | TypedLensAttributes<'lnsHeatmap', HeatmapVisualizationState>
      | TypedLensAttributes<'lnsGauge', GaugeVisualizationState>
      | TypedLensAttributes<'lnsDatatable', DatatableVisualizationState>
      | TypedLensAttributes<'lnsLegacyMetric', LegacyMetricState>
      | TypedLensAttributes<'lnsMetric', MetricVisualizationState>
      | TypedLensAttributes<string, unknown>;
  }
>;

/**
 * Backward compatibility types
 */
export type LensByValueInput = Omit<LensRendererPrivateProps, 'savedObjectId'>;
export type LensByReferenceInput = Omit<LensRendererPrivateProps, 'attributes'>;
export type TypedLensByValueInput = Omit<LensRendererProps, 'savedObjectId'>;
export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;
export type LensEmbeddableOutput = {
  indexPatterns?: DataView[];
} & EmbeddableOutput;
