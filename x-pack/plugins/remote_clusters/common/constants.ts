/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  id: 'remote_clusters',
  // Remote Clusters are used in both CCS and CCR, and CCS is available for all licenses.
  minimumLicenseType: basicLicense,
  getI18nName: (): string => {
    return i18n.translate('xpack.remoteClusters.appName', {
      defaultMessage: 'Remote Clusters',
    });
  },
};

export const API_BASE_PATH = '/api/remote_clusters';
