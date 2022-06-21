/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const osqueryActionTypeBase = {
  id: '.osquery',
  name: 'Osquery',
  minimumLicenseRequired: 'gold' as const,
  iconClass: 'logoOsquery',
  selectMessage: i18n.translate('xpack.osquery.connector.selectActionText', {
    defaultMessage: 'Run Osquery actions.',
  }),
  actionTypeTitle: i18n.translate('xpack.osquery.connector.actionTypeTitle', {
    defaultMessage: 'Osquery',
  }),
};
