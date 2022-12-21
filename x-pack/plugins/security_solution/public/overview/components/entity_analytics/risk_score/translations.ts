/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getRiskEntityTranslation } from '../../../../explore/components/risk_score/translations';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
export * from '../../../../explore/components/risk_score/translations';

export const ENTITY_RISK_TOOLTIP = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.riskToolTip', {
    defaultMessage:
      '{riskEntity} risk classification is determined by {riskEntityLowercase} risk score. {riskEntity}s classified as Critical or High are indicated as risky.',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
      riskEntityLowercase: getRiskEntityTranslation(riskEntity, true),
    },
  });

export const ENTITY_RISK = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.riskClassificationTitle', {
    defaultMessage: '{riskEntity} risk classification',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

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

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.learnMore',
  {
    defaultMessage: 'Learn more',
  }
);
