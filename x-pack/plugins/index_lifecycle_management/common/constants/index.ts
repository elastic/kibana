/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseType } from '../../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  ID: 'index_lifecycle_management',
  minimumLicenseType: basicLicense,
  TITLE: i18n.translate('xpack.indexLifecycleMgmt.appTitle', {
    defaultMessage: 'Index Lifecycle Policies',
  }),
};

export const API_BASE_PATH = '/api/index_lifecycle_management';
