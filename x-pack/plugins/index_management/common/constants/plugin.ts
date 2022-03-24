/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../../licensing/common/types';

const basicLicense: LicenseType = 'basic';

export const PLUGIN = {
  id: 'index_management',
  minimumLicenseType: basicLicense,
  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.idxMgmt.appTitle', {
      defaultMessage: 'Index Management',
    }),
};

// Ideally we want to access the Kibana major version from core
// "PluginInitializerContext.env.packageInfo.version". In some cases it is not possible
// to dynamically inject that version without a huge refactor on the code base.
// We will then keep this single constant to declare on which major branch we are.
export const MAJOR_VERSION = '8.2.0';
