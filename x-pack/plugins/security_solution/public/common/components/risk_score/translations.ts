/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RiskScoreEntity } from '../../../../common/search_strategy';

export const RISK_SCORE_TITLE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.alertDetails.overview.riskScoreTitle', {
    defaultMessage: '{riskEntity} Risk Score',
    values: {
      riskEntity: riskEntity === RiskScoreEntity.host ? 'Host' : 'User',
    },
  });
