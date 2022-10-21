/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';
import 'brace/theme/github';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryAlertMetaData, EsQueryAlertParams, SearchType } from '../types';
import { SearchSourceExpression, SearchSourceExpressionProps } from './search_source_expression';
import { EsQueryExpression } from './es_query_expression';
import { QueryFormTypeChooser } from './query_form_type_chooser';
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
  RuleTypeParamsExpressionProps<EsQueryAlertParams, EsQueryAlertMetaData>
> = (props) => {
  const { ruleParams, errors, setRuleProperty, setRuleParams } = props;
  const isSearchSource = isSearchSourceAlert(ruleParams);
  // metadata provided only when open alert from Discover page
  const isManagementPage = props.metadata?.isManagementPage ?? true;

  const formTypeSelected = useCallback(
    (searchType: SearchType | null) => {
      if (!searchType) {
        // @ts-expect-error Reset rule params regardless of their type
        setRuleProperty('params', {});
        return;
      }
      setRuleParams('searchType', searchType);
    },
    [setRuleParams, setRuleProperty]
  );

  const expressionGenericErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const errorParam = EXPRESSION_ERROR_KEYS.find((errorKey) => {
    return errors[errorKey]?.length >= 1 && ruleParams[errorKey] !== undefined;
  });

  const expressionError = !!errorParam && (
    <>
      <EuiCallOut
        color="danger"
        size="s"
        title={
          ['index', 'searchType'].includes(errorParam)
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

      {/* Showing the selected type */}
      {isManagementPage && (
        <QueryFormTypeChooser
          searchType={ruleParams.searchType as SearchType}
          onFormTypeSelect={formTypeSelected}
        />
      )}

      {ruleParams.searchType && isSearchSource && (
        <SearchSourceExpressionMemoized
          {...props}
          ruleParams={ruleParams}
          unifiedSearch={props.unifiedSearch}
        />
      )}

      {ruleParams.searchType && !isSearchSource && (
        <EsQueryExpression {...props} ruleParams={ruleParams} />
      )}

      <EuiHorizontalRule />
    </>
  );
};
