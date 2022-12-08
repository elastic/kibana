/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export enum AlertEvaluationUnitType {
  Duration,
  Percent,
  Number,
}
export const getAlertEvaluationUnitTypeByRuleTypeId = (
  ruleTypeId: string
): AlertEvaluationUnitType => {
  switch (ruleTypeId) {
    case 'apm.transaction_duration':
      return AlertEvaluationUnitType.Duration;
    case 'apm.transaction_error_rate':
      return AlertEvaluationUnitType.Percent;
    default:
      return AlertEvaluationUnitType.Number;
  }
};
