/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HOST_RISK_SCORE_OVER_TIME = i18n.translate(
  'xpack.securitySolution.hosts.hostScoreOverTime.title',
  {
    defaultMessage: 'Host risk score over time',
  }
);

export const HOST_RISK_THRESHOLD = i18n.translate(
  'xpack.securitySolution.hosts.hostScoreOverTime.riskyThresholdHeader',
  {
    defaultMessage: 'Risky threshold',
  }
);

export const RISKY = i18n.translate('xpack.securitySolution.hosts.hostScoreOverTime.riskyLabel', {
  defaultMessage: 'Risky',
});

export const RISK_SCORE = i18n.translate(
  'xpack.securitySolution.hosts.hostScoreOverTime.riskScore',
  {
    defaultMessage: 'Risk score',
  }
);
