/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getRiskEntityTranslation } from '../risk_score/translations';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
export * from '../risk_score/translations';

export const ENTITY_NAME = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.nameTitle', {
    defaultMessage: '{riskEntity} Name',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const VIEW_ALL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.viewAllLabel',
  {
    defaultMessage: 'View all',
  }
);

export const LAST_UPDATED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.lastUpdatedTitle',
  {
    defaultMessage: 'Last updated',
  }
);
