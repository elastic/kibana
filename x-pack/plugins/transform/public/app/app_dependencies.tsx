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
} from '@kbn/core/public';
import type { SavedObjectsStart as SavedObjectsPluginStart } from '@kbn/saved-objects-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { GetMlSharedImportsReturnType } from '../shared_imports';

export interface AppDependencies {
  application: ApplicationStart;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
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
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection?: UsageCollectionStart;
  charts?: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
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
