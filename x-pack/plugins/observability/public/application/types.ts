/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  ChromeStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
  SavedObjectsStart,
  ThemeServiceStart,
} from 'kibana/public';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { LensPublicStart } from '../../../lens/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { CasesUiStart } from '../../../cases/public';

export interface ObservabilityAppServices {
  application: ApplicationStart;
  cases: CasesUiStart;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  http: HttpStart;
  lens: LensPublicStart;
  navigation: NavigationPublicPluginStart;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  savedObjectsClient: SavedObjectsStart['client'];
  stateTransfer: EmbeddableStateTransfer;
  storage: IStorageWrapper;
  theme: ThemeServiceStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiSettings: IUiSettingsClient;
}
