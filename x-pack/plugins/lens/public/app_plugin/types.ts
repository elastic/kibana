/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
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
import {
  DataPublicPluginStart,
  Filter,
  IndexPattern,
  Query,
  SavedQuery,
} from '../../../../../src/plugins/data/public';
import { Document } from '../persistence';
import { LensEmbeddableInput } from '../editor_frame_service/embeddable/embeddable';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';
import { LensAttributeService } from '../lens_attribute_service';
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DashboardFeatureFlagConfig } from '../../../../../src/plugins/dashboard/public';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';
import {
  VisualizeFieldContext,
  ACTION_VISUALIZE_LENS_FIELD,
} from '../../../../../src/plugins/ui_actions/public';
import { EmbeddableEditorState } from '../../../../../src/plugins/embeddable/public';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { EditorFrameInstance } from '..';

export interface LensAppState {
  isLoading: boolean;
  persistedDoc?: Document;
  lastKnownDoc?: Document;
  isSaveModalVisible: boolean;

  // Used to show a popover that guides the user towards changing the date range when no data is available.
  indicateNoData: boolean;

  // index patterns used to determine which filters are available in the top nav.
  indexPatternsForTopNav: IndexPattern[];

  // Determines whether the lens editor shows the 'save and return' button, and the originating app breadcrumb.
  isLinkedToOriginatingApp?: boolean;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  isSaveable: boolean;
  activeData?: TableInspectorAdapter;
}

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
  redirectToDashboard?: (input: LensEmbeddableInput, dashboardId: string) => void;

  // The initial input passed in by the container when editing. Can be either by reference or by value.
  initialInput?: LensEmbeddableInput;

  // State passed in by the container which is used to determine the id of the Originating App.
  incomingState?: EmbeddableEditorState;
  initialContext?: VisualizeFieldContext;
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
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
  notifications: NotificationsStart;
  navigation: NavigationPublicPluginStart;
  attributeService: LensAttributeService;
  savedObjectsClient: SavedObjectsStart['client'];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  getOriginatingAppName: () => string | undefined;

  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
}

export interface LensTopNavActions {
  saveAndReturn: () => void;
  showSaveModal: () => void;
  cancel: () => void;
  exportToCSV: () => void;
}
