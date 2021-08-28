/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { History } from 'history';
import type {
  ApplicationStart,
  AppMountParameters,
} from '../../../../../src/core/public/application/types';
import type { ChromeStart } from '../../../../../src/core/public/chrome/types';
import type { HttpStart } from '../../../../../src/core/public/http/types';
import type { NotificationsStart } from '../../../../../src/core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../src/core/public/overlays/overlay_service';
import type { SavedObjectsStart } from '../../../../../src/core/public/saved_objects/saved_objects_service';
import type { IUiSettingsClient } from '../../../../../src/core/public/ui_settings/types';
import type {
  DashboardFeatureFlagConfig,
  DashboardStart,
} from '../../../../../src/plugins/dashboard/public/plugin_contract';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public/types';
import { EmbeddableStateTransfer } from '../../../../../src/plugins/embeddable/public/lib/state_transfer/embeddable_state_transfer';
import type { EmbeddableEditorState } from '../../../../../src/plugins/embeddable/public/lib/state_transfer/types';
import type { FieldFormatsStart } from '../../../../../src/plugins/field_formats/public/plugin';
import type { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public/storage/types';
import type { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public/types';
import type { PresentationUtilPluginStart } from '../../../../../src/plugins/presentation_util/public/types';
import type { OnSaveProps } from '../../../../../src/plugins/saved_objects/public/save_modal/saved_object_save_modal';
import type { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public/types';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public/types';
import type { UsageCollectionStart } from '../../../../../src/plugins/usage_collection/public/plugin';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public/types';
import type { LensEmbeddableInput } from '../embeddable/embeddable';
import type { LensAttributeService } from '../lens_attribute_service';
import type { DatasourceMap, EditorFrameInstance, VisualizationMap } from '../types';

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
}

export type RunSave = (
  saveProps: Omit<OnSaveProps, 'onTitleDuplicate' | 'newDescription'> & {
    returnToOrigin: boolean;
    dashboardId?: string | null;
    onTitleDuplicate?: OnSaveProps['onTitleDuplicate'];
    newDescription?: string;
    newTags?: string[];
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
  title?: string;
}

export interface HistoryLocationState {
  type: typeof ACTION_VISUALIZE_LENS_FIELD;
  payload: VisualizeFieldContext;
}

export interface LensAppServices {
  http: HttpStart;
  chrome: ChromeStart;
  overlays: OverlayStart;
  storage: IStorageWrapper;
  dashboard: DashboardStart;
  fieldFormats: FieldFormatsStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
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

  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
}

export interface LensTopNavTooltips {
  showExportWarning: () => string | undefined;
}

export interface LensTopNavActions {
  saveAndReturn: () => void;
  showSaveModal: () => void;
  cancel: () => void;
  exportToCSV: () => void;
}
