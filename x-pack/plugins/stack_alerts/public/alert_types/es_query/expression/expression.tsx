/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import 'brace/theme/github';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ErrorKey, EsQueryAlertParams } from '../types';
import { SearchSourceExpression, SearchSourceExpressionProps } from './search_source_expression';
import { EsQueryExpression } from './es_query_expression';
import { EsQueryFormType, EsQueryFormTypeChooser } from './es_query_form_type_chooser';
import { isSearchSourceAlert, useTriggersAndActionsUiDeps } from '../util';
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
  const { ruleParams, errors } = props;
  const isSearchSource = isSearchSourceAlert(ruleParams);
  const [activeEsQueryFormType, setActiveEsQueryFormType] = useState<EsQueryFormType | null>(null);
  const { data } = useTriggersAndActionsUiDeps();
  const emptySearchConfiguration = useMemo(() => {
    return data.search.searchSource.createEmpty().getSerializedFields();
  }, [data.search.searchSource]);

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

  return (
    <>
      {expressionError}

      {isSearchSource ? (
        <>
          {activeEsQueryFormType === EsQueryFormType.KQL_OR_LUCENE && (
            <EsQueryFormTypeChooser
              activeFormType={activeEsQueryFormType}
              onFormTypeSelect={setActiveEsQueryFormType}
            />
          )}
          <SearchSourceExpressionMemoized
            {...props}
            ruleParams={ruleParams}
            searchType={ruleParams.searchType}
            searchConfiguration={ruleParams.searchConfiguration}
            savedQueryId={ruleParams.savedQueryId}
          />
        </>
      ) : (
        <>
          <EsQueryFormTypeChooser
            activeFormType={activeEsQueryFormType}
            onFormTypeSelect={setActiveEsQueryFormType}
          />
          {activeEsQueryFormType === EsQueryFormType.QUERY_DSL && (
            <EsQueryExpression {...props} ruleParams={ruleParams} />
          )}
          {activeEsQueryFormType === EsQueryFormType.KQL_OR_LUCENE && (
            <SearchSourceExpressionMemoized
              {...props}
              ruleParams={ruleParams}
              searchType="searchSource"
              searchConfiguration={emptySearchConfiguration}
              savedQueryId={undefined}
            />
          )}
        </>
      )}

      <EuiHorizontalRule />
    </>
  );
};
