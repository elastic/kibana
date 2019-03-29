/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const WATCH_TAB_ID_EDIT = 'watchEditTab';
export const WATCH_TAB_ID_SIMULATE = 'watchSimulateTab';

interface WatchTab {
  id: string;
  name: string;
}

export const WATCH_TABS: WatchTab[] = [
  {
    id: WATCH_TAB_ID_EDIT,
    name: i18n.translate('xpack.watcher.sections.watchEdit.json.tabs.edit', {
      defaultMessage: 'Edit',
    }),
  },
  {
    id: WATCH_TAB_ID_SIMULATE,
    name: i18n.translate('xpack.watcher.sections.watchEdit.json.tabs.simulate', {
      defaultMessage: 'Simulate',
    }),
  },
];
