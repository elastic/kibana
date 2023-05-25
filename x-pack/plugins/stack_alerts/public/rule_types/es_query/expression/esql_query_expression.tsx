/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { AggregateQuery } from '@kbn/es-query';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data, metadata, onChangeMetaData }) => {
  const { esqlQuery, excludeHitsFromPreviousRun } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
    threshold: DEFAULT_VALUES.THRESHOLD,
    thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: DEFAULT_VALUES.SIZE,
    esqlQuery: esqlQuery ?? { esql: '' },
    aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: DEFAULT_VALUES.GROUP_BY,
    termSize: DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esqlQuery,
    excludeHitsFromPreviousRun: excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
  });
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });

  const setParam = useCallback(
    (paramField: string, paramValue: unknown) => {
      setCurrentRuleParams((currentParams) => ({
        ...currentParams,
        [paramField]: paramValue,
      }));
      setRuleParams(paramField, paramValue);
    },
    [setRuleParams]
  );

  const setDefaultExpressionValues = async () => {
    setRuleProperty('params', currentRuleParams);
    setQuery(esqlQuery ?? { esql: '' });
  };
  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.defineEsqlQueryPrompt"
            defaultMessage="Define your query using ESQL"
          />
        </h5>
      </EuiTitle>
      <TextBasedLangEditor
        query={query}
        onTextLangQueryChange={(q: AggregateQuery) => {
          setQuery(q);
          setParam('esqlQuery', q);
        }}
        expandCodeEditor={(status: boolean) => true}
        isCodeEditorExpanded={true}
        errors={[]}
        onTextLangQuerySubmit={() => {}}
      />
      <EuiSpacer />
    </Fragment>
  );
};
