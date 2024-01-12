/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { getRiskEntityTranslation } from '../risk_score/translations';

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.enableRiskScore.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before enabling module',
  }
);

export const UPGRADE_RISK_SCORE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.enableRiskScore.upgradeRiskScore', {
    defaultMessage: 'Upgrade {riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const UPGRADE_RISK_SCORE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.riskDeprecated.entity.upgradeRiskScoreDescription',
  {
    defaultMessage:
      'Current data is no longer supported. Please migrate your data and upgrade the module. The data might need an hour to be generated after enabling the module.',
  }
);

export const ENABLE_RISK_SCORE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.enableRiskScore.enableRiskScore', {
    defaultMessage: 'Enable {riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const ENABLE_RISK_SCORE_DESCRIPTION = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.enableRiskScore.enableRiskScoreDescription', {
    defaultMessage:
      'Once you have enabled this feature you can get quick access to the {riskEntity} risk scores in this section. The data might need an hour to be generated after enabling the module.',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity, true),
    },
  });
