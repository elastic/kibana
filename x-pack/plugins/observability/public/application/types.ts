/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApplicationStart } from '../../../../../src/core/public/application/types';
import type { ChromeStart } from '../../../../../src/core/public/chrome/types';
import type { HttpStart } from '../../../../../src/core/public/http/types';
import type { NotificationsStart } from '../../../../../src/core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../../src/core/public/overlays/overlay_service';
import type { SavedObjectsStart } from '../../../../../src/core/public/saved_objects/saved_objects_service';
import type { IUiSettingsClient } from '../../../../../src/core/public/ui_settings/types';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public/types';
import { EmbeddableStateTransfer } from '../../../../../src/plugins/embeddable/public/lib/state_transfer/embeddable_state_transfer';
import type { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public/storage/types';
import type { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public/types';
import type { LensPublicStart } from '../../../lens/public/plugin';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public/plugin';

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

  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  lens: LensPublicStart;
}
