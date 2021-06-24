/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const logsTitle = i18n.translate('xpack.infra.header.logsTitle', {
  defaultMessage: 'Logs',
});

export const streamTitle = i18n.translate('xpack.infra.logs.index.streamTabTitle', {
  defaultMessage: 'Stream',
});

export const anomaliesTitle = i18n.translate('xpack.infra.logs.index.anomaliesTabTitle', {
  defaultMessage: 'Anomalies',
});

export const logCategoriesTitle = i18n.translate(
  'xpack.infra.logs.index.logCategoriesBetaBadgeTitle',
  {
    defaultMessage: 'Categories',
  }
);

export const settingsTitle = i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
  defaultMessage: 'Settings',
});

export const streamTab = {
  app: 'logs',
  title: streamTitle,
  pathname: '/stream',
};
