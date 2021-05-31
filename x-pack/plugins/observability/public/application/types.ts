/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApplicationStart,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  SavedObjectsStart,
} from 'kibana/public';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { PresentationUtilPluginStart } from 'src/plugins/presentation_util/public';
import { DashboardFeatureFlagConfig } from 'src/plugins/dashboard/public';
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { LensPublicStart } from '../../../lens/public';
import { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';

export interface ObservabilityAppServices {
  http: HttpStart;
  chrome: ChromeStart;
  overlays: OverlayStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  application: ApplicationStart;
  notifications: NotificationsStart;
  stateTransfer: EmbeddableStateTransfer;
  navigation: NavigationPublicPluginStart;
  savedObjectsClient: SavedObjectsStart['client'];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  getOriginatingAppName: () => string | undefined;

  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  lens: LensPublicStart;
  presentationUtil: PresentationUtilPluginStart;

  // Temporarily required until the 'by value' paradigm is default.
  dashboardFeatureFlag: DashboardFeatureFlagConfig;
}
