/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

export const PLUGIN = {
  ID: 'customBranding',
  MINIMUM_LICENSE_REQUIRED: 'enterprise' as LicenseType,
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.customBranding.appName', {
      defaultMessage: 'Custom Branding',
    });
  },
};
