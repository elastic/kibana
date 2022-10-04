/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RiskScoreEntity } from '../../../../common/search_strategy';

export const HOST = i18n.translate('xpack.securitySolution.riskScore.overview.hostTitle', {
  defaultMessage: 'Host',
});

export const HOST_LOWERCASE = i18n.translate(
  'xpack.securitySolution.riskScore.overview.hostLowercase',
  {
    defaultMessage: 'host',
  }
);

export const USER = i18n.translate('xpack.securitySolution.riskScore.overview.userTitle', {
  defaultMessage: 'User',
});

export const USER_LOWERCASE = i18n.translate(
  'xpack.securitySolution.riskScore.overview.userLowercase',
  {
    defaultMessage: 'user',
  }
);

export const RISK_SCORE_TITLE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.riskScore.overview.riskScoreTitle', {
    defaultMessage: '{riskEntity} Risk Score',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const getRiskEntityTranslation = (riskEntity: RiskScoreEntity, lowercase = false) =>
  lowercase
    ? riskEntity === RiskScoreEntity.host
      ? HOST_LOWERCASE
      : USER_LOWERCASE
    : riskEntity === RiskScoreEntity.host
    ? HOST
    : USER;
