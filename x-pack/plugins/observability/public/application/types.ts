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
import { IStorageWrapper } from '../../../../../src/plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { LensPublicStart } from '../../../lens/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { CasesUiStart } from '../../../cases/public';

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
  cases: CasesUiStart;
}
