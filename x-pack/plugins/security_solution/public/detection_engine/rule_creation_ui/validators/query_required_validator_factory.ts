/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import type { RuleType } from '@kbn/securitysolution-rules';
import type { FormData, ValidationFunc } from '../../../shared_imports';
import { isEqlRule, isEsqlRule } from '../../../../common/detection_engine/utils';
import type { FieldValueQueryBar } from '../components/query_field';

export function queryRequiredValidatorFactory(
  ruleType: RuleType
): ValidationFunc<FormData, string, FieldValueQueryBar> {
  return (...args) => {
    const [{ path, value }] = args;

    if (isEmpty(value.query.query as string) && isEmpty(value.filters)) {
      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: getErrorMessage(ruleType),
      };
    }
  };
}

function getErrorMessage(ruleType: RuleType): string {
  if (isEsqlRule(ruleType)) {
    return i18n.translate(
      'xpack.securitySolution.ruleManagement.ruleCreation.validation.query.esqlQueryFieldRequiredError',
      {
        defaultMessage: 'An ES|QL query is required.',
      }
    );
  }

  if (isEqlRule(ruleType)) {
    return i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.eqlQueryFieldRequiredError',
      {
        defaultMessage: 'An EQL query is required.',
      }
    );
  }

  return i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
    {
      defaultMessage: 'A custom query is required.',
    }
  );
}
