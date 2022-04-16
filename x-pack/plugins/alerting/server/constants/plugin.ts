/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/server';

export const PLUGIN = {
  ID: 'alerting',
  MINIMUM_LICENSE_REQUIRED: 'basic' as LicenseType, // TODO: supposed to be changed up on requirements
  // all plugins seem to use getI18nName with any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.alerting.appName', {
      defaultMessage: 'Alerting',
    }),
};
