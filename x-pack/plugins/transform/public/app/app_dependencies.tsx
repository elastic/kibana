/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ScopedHistory } from 'kibana/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

export interface AppDependencies {
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
