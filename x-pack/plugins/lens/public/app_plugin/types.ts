/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { OnSaveProps } from 'src/plugins/saved_objects/public';
import {
  ApplicationStart,
  AppMountParameters,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  SavedObjectsStart,
} from '../../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { UsageCollectionStart } from '../../../../../src/plugins/usage_collection/public';
import { DashboardStart } from '../../../../../src/plugins/dashboard/public';
import { LensEmbeddableInput } from '../embeddable/embeddable';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import { LensAttributeService } from '../lens_attribute_service';
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DashboardFeatureFlagConfig } from '../../../../../src/plugins/dashboard/public';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';
import {
  VisualizeFieldContext,
  ACTION_VISUALIZE_LENS_FIELD,
} from '../../../../../src/plugins/ui_actions/public';
import {
  EmbeddableEditorState,
  EmbeddableStateTransfer,
} from '../../../../../src/plugins/embeddable/public';
import { DatasourceMap, EditorFrameInstance, VisualizationMap } from '../types';
import { PresentationUtilPluginStart } from '../../../../../src/plugins/presentation_util/public';
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
