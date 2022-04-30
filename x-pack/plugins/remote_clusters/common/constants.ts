/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  // Remote Clusters are used in both CCS and CCR, and CCS is available for all licenses.
  minimumLicenseType: basicLicense,
  getI18nName: (): string => {
    return i18n.translate('xpack.remoteClusters.appName', {
      defaultMessage: 'Remote Clusters',
    });
  },
};

export const MAJOR_VERSION = '8.0.0';

export const API_BASE_PATH = '/api/remote_clusters';

export const SNIFF_MODE = 'sniff';
export const PROXY_MODE = 'proxy';
