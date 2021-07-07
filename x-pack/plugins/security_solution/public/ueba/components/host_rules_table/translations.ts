/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.uebaTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {rule} other {rules}}`,
  });

export const NAME = i18n.translate('xpack.securitySolution.uebaTable.ruleName', {
  defaultMessage: 'Rule name',
});

export const RISK_SCORE = i18n.translate('xpack.securitySolution.uebaTable.totalRiskScore', {
  defaultMessage: 'Total risk score',
});

export const RULE_TYPE = i18n.translate('xpack.securitySolution.uebaTable.ruleType', {
  defaultMessage: 'Rule type',
});

export const HITS = i18n.translate('xpack.securitySolution.uebaTable.hits', {
  defaultMessage: 'Number of hits',
});

export const ROWS_5 = i18n.translate('xpack.securitySolution.uebaTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.securitySolution.uebaTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
