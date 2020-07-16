/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../../licensing/common/types';

const goldLicense: LicenseType = 'gold';

export const PLUGIN = {
  ID: 'watcher',
  MINIMUM_LICENSE_REQUIRED: goldLicense,
  getI18nName: (): string => {
    return i18n.translate('xpack.watcher.appName', {
      defaultMessage: 'Watcher',
    });
  },
};
