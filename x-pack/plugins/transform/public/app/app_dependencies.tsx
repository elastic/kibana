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
  HttpSetup,
  I18nStart,
  IUiSettingsClient,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsStart,
  ThemeServiceStart,
} from 'kibana/public';
import type { SavedObjectsStart as SavedObjectsPluginStart } from 'src/plugins/saved_objects/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { ScopedHistory } from 'kibana/public';
import type { SharePluginStart } from 'src/plugins/share/public';
import type { SpacesPluginStart } from '../../../spaces/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { Storage } from '../../../../../src/plugins/kibana_utils/public';

import type { GetMlSharedImportsReturnType } from '../shared_imports';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';

export interface AppDependencies {
  application: ApplicationStart;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  http: HttpSetup;
  i18n: I18nStart;
  notifications: NotificationsSetup;
  uiSettings: IUiSettingsClient;
  savedObjects: SavedObjectsStart;
  storage: Storage;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  history: ScopedHistory;
  savedObjectsPlugin: SavedObjectsPluginStart;
  share: SharePluginStart;
  ml: GetMlSharedImportsReturnType;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const useAppDependencies = () => {
  return useKibana().services as AppDependencies;
};

export const useToastNotifications = () => {
  const {
    notifications: { toasts: toastNotifications },
  } = useAppDependencies();
  return toastNotifications;
};
