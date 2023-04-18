/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { Observable } from 'rxjs';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type {
  ApplicationStart,
  AppMountParameters,
  ChromeStart,
  CoreStart,
  CoreTheme,
  ExecutionContextStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  SavedObjectsStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DashboardFeatureFlagConfig } from '@kbn/dashboard-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import {
  VisualizeFieldContext,
  ACTION_VISUALIZE_LENS_FIELD,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';
import { ACTION_CONVERT_TO_LENS } from '@kbn/visualizations-plugin/public';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type {
  DatasourceMap,
  EditorFrameInstance,
  VisualizeEditorContext,
  LensTopNavMenuEntryGenerator,
  VisualizationMap,
  UserMessagesGetter,
} from '../types';
import type { LensAttributeService } from '../lens_attribute_service';
import type { LensEmbeddableInput } from '../embeddable/embeddable';
import type { LensInspector } from '../lens_inspector_service';
import { IndexPatternServiceAPI } from '../data_views_service/service';
import { Document } from '../persistence/saved_object_store';
import { type LensAppLocator, LensAppLocatorParams } from '../../common/locator/locator';

export interface RedirectToOriginProps {
  input?: LensEmbeddableInput;
  isCopied?: boolean;
}

export interface LensAppProps {
  history: History;
  editorFrame: EditorFrameInstance;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  redirectTo: (savedObjectId?: string) => void;
  redirectToOrigin?: (props?: RedirectToOriginProps) => void;

  // The initial input passed in by the container when editing. Can be either by reference or by value.
  initialInput?: LensEmbeddableInput;

  // State passed in by the container which is used to determine the id of the Originating App.
  incomingState?: EmbeddableEditorState;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  initialContext?: VisualizeEditorContext | VisualizeFieldContext;
  contextOriginatingApp?: string;
  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
  theme$: Observable<CoreTheme>;
  coreStart: CoreStart;
}

export type RunSave = (
  saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
    returnToOrigin: boolean;
    dashboardId?: string | null;
    onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
    newDescription?: string;
    newTags?: string[];
    panelTimeRange?: TimeRange;
  },
  options: {
    saveToLibrary: boolean;
  }
) => Promise<void>;

export interface LensTopNavMenuProps {
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];

  redirectToOrigin?: (props?: RedirectToOriginProps) => void;
  // The initial input passed in by the container when editing. Can be either by reference or by value.
  initialInput?: LensEmbeddableInput;
  getIsByValueMode: () => boolean;
  indicateNoData: boolean;
  setIsSaveModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  runSave: RunSave;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  title?: string;
  lensInspector: LensInspector;
  goBackToOriginatingApp?: () => void;
  contextOriginatingApp?: string;
  initialContextIsEmbedded?: boolean;
  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  currentDoc: Document | undefined;
  theme$: Observable<CoreTheme>;
  indexPatternService: IndexPatternServiceAPI;
  onTextBasedSavedAndExit: ({ onSave }: { onSave: () => void }) => Promise<void>;
  getUserMessages: UserMessagesGetter;
  shortUrlService: (params: LensAppLocatorParams) => Promise<string>;
  isCurrentStateDirty: boolean;
}

export interface HistoryLocationState {
  type: typeof ACTION_VISUALIZE_LENS_FIELD | typeof ACTION_CONVERT_TO_LENS;
  payload: VisualizeFieldContext | VisualizeEditorContext;
  originatingApp?: string;
}

export interface LensAppServices {
  http: HttpStart;
  executionContext: ExecutionContextStart;
  chrome: ChromeStart;
  overlays: OverlayStart;
  storage: IStorageWrapper;
  dashboard: DashboardStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  inspector: LensInspector;
  uiSettings: IUiSettingsClient;
  uiActions: UiActionsStart;
  application: ApplicationStart;
  notifications: NotificationsStart;
  usageCollection?: UsageCollectionStart;
  stateTransfer: EmbeddableStateTransfer;
  navigation: NavigationPublicPluginStart;
  attributeService: LensAttributeService;
  savedObjectsClient: SavedObjectsStart['client'];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  getOriginatingAppName: () => string | undefined;
  presentationUtil: PresentationUtilPluginStart;
  spaces?: SpacesApi;
  charts: ChartsPluginSetup;
  share?: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  docLinks: DocLinksStart;
  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
  dataViewEditor: DataViewEditorStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  locator?: LensAppLocator;
}

interface TopNavAction {
  visible: boolean;
  enabled?: boolean;
  execute: (anchorElement: HTMLElement) => void;
  getLink?: () => string | undefined;
  tooltip?: () => string | undefined;
}

type AvailableTopNavActions =
  | 'inspect'
  | 'saveAndReturn'
  | 'showSaveModal'
  | 'goBack'
  | 'cancel'
  | 'share'
  | 'getUnderlyingDataUrl'
  | 'openSettings';
export type LensTopNavActions = Record<AvailableTopNavActions, TopNavAction>;
