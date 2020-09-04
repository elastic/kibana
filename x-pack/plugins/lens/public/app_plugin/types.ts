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
import { EmbeddableEditorState } from '../../../../../src/plugins/embeddable/public';
import { EditorFrameInstance } from '..';

export interface LensAppState {
  indicateNoData: boolean;
  isLoading: boolean;
  isSaveModalVisible: boolean;
  indexPatternsForTopNav: IndexPattern[];
  persistedDoc?: Document;
  lastKnownDoc?: Document;

  // Properties needed to interface with TopNav
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  isSaveable: boolean;
}

export interface LensAppProps {
  history: History;
  editorFrame: EditorFrameInstance;
  onAppLeave: AppMountParameters['onAppLeave'];
  redirectTo: (savedObjectId?: string) => void;
  redirectToOrigin?: (input?: LensEmbeddableInput) => void;
  initialInput?: LensEmbeddableInput;
}

export interface LensAppServices {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  notifications: NotificationsStart;
  attributeService: LensAttributeService;
  storage: IStorageWrapper;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
  chrome: ChromeStart;
  http: HttpStart;
  incomingState?: EmbeddableEditorState;

  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
}

export enum LensTopNavMode {
  LINKED_TO_CONTAINER,
  UNLINKED,
}

export interface LensTopNavActions {
  saveAndReturn: () => void;
  showSaveModal: () => void;
  cancel: () => void;
}
