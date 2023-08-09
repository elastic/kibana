/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_INVESTIGATION_GUIDE = (requiredLicense: string) =>
  i18n.translate('xpack.securitySolutionEss.markdown.insight.upsell', {
    defaultMessage: 'Upgrade to {requiredLicense} to make use of insights in investigation guides',
    values: {
      requiredLicense,
    },
  });
