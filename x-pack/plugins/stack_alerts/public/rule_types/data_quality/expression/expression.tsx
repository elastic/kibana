/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'brace/theme/github';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EsQueryRuleParams, EsQueryRuleMetaData } from '../types';
import { EsQueryExpression } from './es_query_expression';
import { isSearchSourceRule } from '../util';
import { ALL_EXPRESSION_ERROR_KEYS } from '../constants';

export const EsQueryRuleTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryRuleParams, EsQueryRuleMetaData>
> = (props) => {
  const { ruleParams, errors, setRuleProperty, setRuleParams } = props;
  const isSearchSource = isSearchSourceRule(ruleParams);
  // metadata provided only when open alert from Discover page

  const expressionGenericErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const errorParam = ALL_EXPRESSION_ERROR_KEYS.find((errorKey) => {
    return errors[errorKey]?.length >= 1 && ruleParams[errorKey] !== undefined;
  });

  const expressionError = !!errorParam && (
    <>
      <EuiCallOut
        color="danger"
        size="s"
        data-test-subj="esQueryAlertExpressionError"
        title={
          ['index', 'searchType', 'timeField'].includes(errorParam)
            ? errors[errorParam]
            : expressionGenericErrorMessage
        }
      />
      <EuiSpacer />
    </>
  );

  return (
    <>
      {expressionError}

      <EsQueryExpression {...props} ruleParams={ruleParams} />

      <EuiHorizontalRule />
    </>
  );
};
