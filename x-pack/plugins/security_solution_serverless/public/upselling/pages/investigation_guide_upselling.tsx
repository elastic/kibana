/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureKey } from '@kbn/security-solution-plugin/common';
import { i18n } from '@kbn/i18n';

export const UPGRADE_INVESTIGATION_GUIDE = (productTypeRequired: AppFeatureKey) =>
  i18n.translate('xpack.securitySolutionServerless.markdown.insight.upsell', {
    defaultMessage: 'Upgrade to {productTypeRequired} make use of insights in investigation guides',
    values: {
      productTypeRequired,
    },
  });

export const investigationGuideUpselling = (requiredPLI: AppFeatureKey) =>
  UPGRADE_INVESTIGATION_GUIDE(requiredPLI);

// eslint-disable-next-line import/no-default-export
export { investigationGuideUpselling as default };
