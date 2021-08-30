/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.uebaTableRiskScore.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {user} other {users}}`,
  });

export const NAME = i18n.translate('xpack.securitySolution.uebaTableRiskScore.nameTitle', {
  defaultMessage: 'Host name',
});

export const RISK_SCORE = i18n.translate('xpack.securitySolution.uebaTableRiskScore.riskScore', {
  defaultMessage: 'Risk score',
});

export const CURRENT_RISK = i18n.translate(
  'xpack.securitySolution.uebaTableRiskScore.currentRisk',
  {
    defaultMessage: 'Current risk',
  }
);
