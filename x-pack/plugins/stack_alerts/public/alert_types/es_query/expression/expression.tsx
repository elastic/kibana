/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import 'brace/theme/github';

import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ErrorKey, EsQueryAlertParams } from '../types';
import { SearchSourceExpression } from './search_source_expression';
import { EsQueryExpression } from './es_query_expression';
import { isSearchSourceAlert } from '../util';
import { EXPRESSION_ERROR_KEYS } from '../constants';

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryAlertParams>
> = (props) => {
  const { ruleParams, errors } = props;
  const isSearchSource = isSearchSourceAlert(ruleParams);

  const hasExpressionErrors = Object.keys(errors).some((errorKey) => {
    return (
      EXPRESSION_ERROR_KEYS.includes(errorKey as ErrorKey) &&
      errors[errorKey].length >= 1 &&
      ruleParams[errorKey] !== undefined
    );
  });

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  return (
    <>
      {hasExpressionErrors && (
        <>
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </>
      )}

      {isSearchSource ? (
        <SearchSourceExpression {...props} ruleParams={ruleParams} />
      ) : (
        <EsQueryExpression {...props} ruleParams={ruleParams} />
      )}
    </>
  );
};
