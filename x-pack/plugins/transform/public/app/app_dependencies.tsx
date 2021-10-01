/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from 'src/core/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { SavedObjectsStart } from 'src/plugins/saved_objects/public';
import type { ScopedHistory } from 'kibana/public';
import type { SharePluginStart } from 'src/plugins/share/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { Storage } from '../../../../../src/plugins/kibana_utils/public';

import type { GetMlSharedImportsReturnType } from '../shared_imports';

export interface AppDependencies {
  application: CoreStart['application'];
  chrome: CoreStart['chrome'];
  data: DataPublicPluginStart;
  docLinks: CoreStart['docLinks'];
  http: CoreSetup['http'];
  i18n: CoreStart['i18n'];
  notifications: CoreSetup['notifications'];
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  storage: Storage;
  overlays: CoreStart['overlays'];
  history: ScopedHistory;
  savedObjectsPlugin: SavedObjectsStart;
  share: SharePluginStart;
  ml: GetMlSharedImportsReturnType;
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
