/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';

import 'brace/theme/github';

import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '../../../../../triggers_actions_ui/public';
import { EsQueryAlertParams } from '../types';
import { SearchSourceThresholdExpression } from './search_source_expression';
import { EsQueryExpression } from './es_query_expression';
import { isSearchSourceAlert } from '../util';

const expressionFieldsWithValidation = [
  'index',
  'size',
  'timeField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
  'searchType',
  'esQuery',
  'searchConfiguration',
];

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryAlertParams>
> = (props) => {
  const { ruleParams, errors } = props;
  const isSearchSource = isSearchSourceAlert(ruleParams);

  const hasExpressionErrors = !!Object.keys(errors).find((errorKey) => {
    return (
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      ruleParams[errorKey as keyof EsQueryAlertParams] !== undefined
    );
  });

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  return (
    <Fragment>
      {hasExpressionErrors && (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      )}

      {isSearchSource ? (
        <SearchSourceThresholdExpression {...props} ruleParams={ruleParams} />
      ) : (
        <EsQueryExpression {...props} ruleParams={ruleParams} />
      )}
    </Fragment>
  );
};
