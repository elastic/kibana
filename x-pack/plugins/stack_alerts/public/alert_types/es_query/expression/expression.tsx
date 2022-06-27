/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import 'brace/theme/github';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ErrorKey, EsQueryAlertParams, SearchType } from '../types';
import { SearchSourceExpression, SearchSourceExpressionProps } from './search_source_expression';
import { EsQueryExpression } from './es_query_expression';
import { QueryFormType, QueryFormTypeChooser } from './query_form_type_chooser';
import { isSearchSourceAlert } from '../util';
import { EXPRESSION_ERROR_KEYS } from '../constants';

function areSearchSourceExpressionPropsEqual(
  prevProps: Readonly<PropsWithChildren<SearchSourceExpressionProps>>,
  nextProps: Readonly<PropsWithChildren<SearchSourceExpressionProps>>
) {
  const areErrorsEqual = deepEqual(prevProps.errors, nextProps.errors);
  const areRuleParamsEqual = deepEqual(prevProps.ruleParams, nextProps.ruleParams);
  return areErrorsEqual && areRuleParamsEqual;
}

const SearchSourceExpressionMemoized = memo<SearchSourceExpressionProps>(
  SearchSourceExpression,
  areSearchSourceExpressionPropsEqual
);

export const EsQueryAlertTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryAlertParams>
> = (props) => {
  const { ruleParams, errors, setRuleProperty } = props;
  const isSearchSource = isSearchSourceAlert(ruleParams);
  const [activeQueryFormType, setActiveQueryFormType] = useState<QueryFormType | null>(null);

  const resetFormType = useCallback(() => {
    // @ts-expect-error Reset rule params regardless of their type
    setRuleProperty('params', {});
    setActiveQueryFormType(null);
  }, [setActiveQueryFormType, setRuleProperty]);

  const formTypeSelected = useCallback(
    (formType: QueryFormType | null) => {
      if (!formType) {
        resetFormType();
        return;
      }

      setActiveQueryFormType(formType);
    },
    [setActiveQueryFormType, resetFormType]
  );

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

  const expressionError = hasExpressionErrors && (
    <>
      <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
      <EuiSpacer />
    </>
  );

  // Creating a rule from Stack Management page
  if ((!ruleParams || !Object.keys(ruleParams).length) && !activeQueryFormType) {
    // Showing the type chooser
    return (
      <QueryFormTypeChooser
        activeFormType={activeQueryFormType}
        onFormTypeSelect={formTypeSelected}
      />
    );
  }

  return (
    <>
      {expressionError}

      {/* Showing the selected type */}
      {activeQueryFormType && (
        <QueryFormTypeChooser
          activeFormType={activeQueryFormType}
          onFormTypeSelect={formTypeSelected}
        />
      )}

      {isSearchSource ? (
        <SearchSourceExpressionMemoized {...props} ruleParams={ruleParams} />
      ) : (
        <>
          {activeQueryFormType === QueryFormType.KQL_OR_LUCENE ? (
            <SearchSourceExpressionMemoized
              {...props}
              ruleParams={{
                ...ruleParams,
                searchType: SearchType.searchSource,
                searchConfiguration: {},
              }}
              shouldResetSearchConfiguration
            />
          ) : (
            <EsQueryExpression {...props} ruleParams={ruleParams} />
          )}
        </>
      )}

      <EuiHorizontalRule />
    </>
  );
};
