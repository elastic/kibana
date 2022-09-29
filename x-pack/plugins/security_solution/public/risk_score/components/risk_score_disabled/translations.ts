/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { getRiskEntityTranslation } from '../translations';

export const ENABLE_RISK_SCORE_POPOVER = i18n.translate(
  'xpack.securitySolution.riskScoreDisabled.hostsRiskDashboard.enableRiskScorePopoverTitle',
  {
    defaultMessage: 'Alerts need to be available before enabling module',
  }
);

export const ENABLE_RISK_SCORE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskScoreDisabled.riskDashboard.enableRiskScore', {
    defaultMessage: 'Enable {riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const ENABLE_RISK_SCORE_DESCRIPTION = (riskEntity: RiskScoreEntity) =>
  i18n.translate(
    'xpack.securitySolution.riskScoreDisabled.riskDashboard.enableRiskScoreDescription',
    {
      defaultMessage:
        'Once you have enabled this feature you can get quick access to the {riskEntity} risk scores in this section.',
      values: {
        riskEntity: getRiskEntityTranslation(riskEntity, true),
      },
    }
  );
