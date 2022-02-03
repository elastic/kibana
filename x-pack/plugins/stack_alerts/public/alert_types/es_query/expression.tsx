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
import { RuleTypeParamsExpressionProps } from '../../../../triggers_actions_ui/public';
import { EsQueryAlertParams } from './types';
import { IndexThresholdParameters } from './index_threshold_expression';
import { EsQueryExpression } from './es_query_expression';

const expressionFieldsWithValidation = [
  'index',
  'esQuery',
  'size',
  'timeField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryAlertParams>
> = (props) => {
  const {
    ruleParams: { searchType },
    ruleParams,
    errors,
  } = props;

  const isIndexThreshold = searchType === 'searchSource';

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

      {isIndexThreshold ? (
        <IndexThresholdParameters {...props} />
      ) : (
        <EsQueryExpression {...props} />
      )}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EsQueryAlertTypeExpression as default };
