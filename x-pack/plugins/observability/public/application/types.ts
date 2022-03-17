/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  ChromeStart,
  DocLinksStart,
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
import { DataViewsPublicPluginStart } from '../../../../../src/plugins/data_views/public';
import { LensPublicStart } from '../../../lens/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { CasesUiStart } from '../../../cases/public';
import { TimelinesUIStart } from '../../../timelines/public';

export interface ObservabilityAppServices {
  application: ApplicationStart;
  cases: CasesUiStart;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  lens: LensPublicStart;
  navigation: NavigationPublicPluginStart;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  savedObjectsClient: SavedObjectsStart['client'];
  stateTransfer: EmbeddableStateTransfer;
  storage: IStorageWrapper;
  theme: ThemeServiceStart;
  timelines: TimelinesUIStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiSettings: IUiSettingsClient;
}
