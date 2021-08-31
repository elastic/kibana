/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LAST_UPDATED = i18n.translate('xpack.securitySolution.artifactCard.lastUpdated', {
  defaultMessage: 'Last updated',
});

export const CREATED = i18n.translate('xpack.securitySolution.artifactCard.created', {
  defaultMessage: 'Created',
});

export const LAST_UPDATED_BY = i18n.translate('xpack.securitySolution.artifactCard.lastUpdatedBy', {
  defaultMessage: 'Updated by',
});

export const CREATED_BY = i18n.translate('xpack.securitySolution.artifactCard.createdBy', {
  defaultMessage: 'Created by',
});

export const GLOBAL_EFFECT_SCOPE = i18n.translate(
  'xpack.securitySolution.artifactCard.globalEffectScope',
  {
    defaultMessage: 'Applied globally',
  }
);

export const POLICY_EFFECT_SCOPE = (policyCount = 0) => {
  return i18n.translate('xpack.securitySolution.artifactCard.policyEffectScope', {
    defaultMessage: 'Applied to {count} policies',
    values: {
      count: policyCount,
    },
  });
};
