/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const statusNameMap: Record<string, string> = {
  active: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.active', {
    defaultMessage: 'Active',
  }),
  recovered: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.recovered', {
    defaultMessage: 'Recovered',
  }),
  untracked: i18n.translate('xpack.ml.explorer.alertsPanel.statusNameMap.untracked', {
    defaultMessage: 'Untracked',
  }),
};
