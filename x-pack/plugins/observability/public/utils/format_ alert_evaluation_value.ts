/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asMillisecondDuration, asPercent } from '../../common/utils/formatters';
import {
  AlertEvaluationUnitType,
  getAlertEvaluationUnitTypeByRuleTypeId,
} from './get_alert_evaluation_unit_type_by_rule_type_id';

export const formatAlertEvaluationValue = (ruleTypeId: string, evaluationValue?: number) => {
  if (!evaluationValue) return '-';
  const unitType = getAlertEvaluationUnitTypeByRuleTypeId(ruleTypeId);
  switch (unitType) {
    case AlertEvaluationUnitType.Duration:
      return asMillisecondDuration(evaluationValue);
    case AlertEvaluationUnitType.Percent:
      return asPercent(evaluationValue, 100);
    default:
      return evaluationValue;
  }
};
