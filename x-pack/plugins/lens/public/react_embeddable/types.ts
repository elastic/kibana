/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableStart } from '@kbn/embeddable-plugin/public';
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
  ViewMode,
} from '@kbn/presentation-publishing';
// import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
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
import { DataPublicPluginStart, TimefilterContract, FilterManager } from '@kbn/data-plugin/public';
import { DataViewsContract, DataViewSpec } from '@kbn/data-views-plugin/common';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { RecursiveReadonly } from '@kbn/utility-types';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
import { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
import { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
import { LensDocument } from '../persistence';
import { LensInspector } from '../lens_inspector_service';
import { LensAttributesService } from '../lens_attribute_service';
import { DocumentToExpressionReturnType } from '../async_services';
import {
  AddUserMessages,
  Datasource,
  DatasourceMap,
  IndexPatternMap,
  IndexPatternRef,
  LensTableRowContextMenuEvent,
  Simplify,
  Visualization,
  VisualizationMap,
} from '../types';
// import { LensSavedObjectAttributes } from '../embeddable';
import { LensPluginStartDependencies } from '../plugin';
import { TableInspectorAdapter } from '../editor_frame_service/types';

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

export interface LensEmbeddableStartServices {
  data: DataPublicPluginStart;
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  coreStart: CoreStart;
  inspector: InspectorStartContract;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  dataViews: DataViewsContract;
  uiActions?: UiActionsStart;
  usageCollection?: UsageCollectionSetup;
  documentToExpression: (doc: LensDocument) => Promise<DocumentToExpressionReturnType>;
  injectFilterReferences: FilterManager['inject'];
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
  attributeService: LensAttributesService;
  embeddable: EmbeddableStart;
}

interface PreventableEvent {
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

export interface LensCallbacks {
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (isLoading: boolean, adapters?: Partial<DefaultInspectorAdapters>) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
}

interface ViewInDiscoverCallbacks {
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs | undefined;
}

interface InlineEditing {
  openConfigPanel: (
    services: LensPluginStartDependencies,
    isNewPanel?: boolean,
    deletePanel?: () => void
  ) => Promise<JSX.Element | null>;
}

interface IntegrationCallbacks {
  isTextBasedLanguage: () => boolean | undefined;
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
}

export type LensApiCallbacks = Simplify<
  LensCallbacks & ViewInDiscoverCallbacks & InlineEditing & IntegrationCallbacks
>;

export interface LensUnifiedSearchContext {
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
  timeslice?: [number, number];
}

type LensKibanaContextProps = LensUnifiedSearchContext & {
  palette?: PaletteOutput;
};

interface LensPanelStyleProps {
  renderMode?: ViewMode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
}

interface LensRequestHandlersProps {
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
    LensPanelStyleProps &
    SerializedTitles &
    Partial<DynamicActionsSerializedState>
>;

/**
 * This is a version of the LensSerializedState who has the attributes defined
 * and is ready to be used in the runtime.
 * This helps clear it out the different between a by-Value and by-Ref state.
 * From this state onward, the only difference between by-Value and by-Ref would be the
 * presence of the savedObjectId.
 */
export type LensRuntimeState = Simplify<
  Omit<LensSerializedState, 'attributes'> & {
    attributes: NonNullable<LensSerializedState['attributes']>;
  }
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
