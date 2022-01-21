/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { OnSaveProps } from 'src/plugins/saved_objects/public';
import { SpacesApi } from '../../../spaces/public';
import type {
  ApplicationStart,
  AppMountParameters,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  SavedObjectsStart,
} from '../../../../../src/core/public';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import type { UsageCollectionStart } from '../../../../../src/plugins/usage_collection/public';
import type { DashboardStart } from '../../../../../src/plugins/dashboard/public';
import type { LensEmbeddableInput } from '../embeddable/embeddable';
import type { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import type { LensAttributeService } from '../lens_attribute_service';
import type { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import type { DashboardFeatureFlagConfig } from '../../../../../src/plugins/dashboard/public';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';
import {
  VisualizeFieldContext,
  ACTION_VISUALIZE_LENS_FIELD,
} from '../../../../../src/plugins/ui_actions/public';
import type {
  EmbeddableEditorState,
  EmbeddableStateTransfer,
} from '../../../../../src/plugins/embeddable/public';
import type {
  DatasourceMap,
  EditorFrameInstance,
  LensTopNavMenuEntryGenerator,
  VisualizationMap,
} from '../types';
import type { PresentationUtilPluginStart } from '../../../../../src/plugins/presentation_util/public';
import type { FieldFormatsStart } from '../../../../../src/plugins/field_formats/public';
import type { LensInspector } from '../lens_inspector_service';

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

  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
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
  lensInspector: LensInspector;
  topNavMenuEntryGenerators: LensTopNavMenuEntryGenerator[];
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
  inspector: LensInspector;
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
  spaces: SpacesApi;

  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
}

export interface LensTopNavTooltips {
  showExportWarning: () => string | undefined;
}

export interface LensTopNavActions {
  inspect: () => void;
  saveAndReturn: () => void;
  showSaveModal: () => void;
  cancel: () => void;
  exportToCSV: () => void;
}
