/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LICENSE_TYPE_BASIC, LicenseType } from '../../../../legacy/common/constants';

export const PLUGIN = {
  ID: 'alerts',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType, // TODO: supposed to be changed up on requirements
  // all plugins seem to use getI18nName with any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.alerts.appName', {
      defaultMessage: 'Alerts',
    }),
};
