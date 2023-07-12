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
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import { AggregateQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/public/common';
import { Datatable } from '@kbn/expressions-plugin/common';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { toEsQueryHits, transformDatatableToEsqlTable } from '../../../../common';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data, metadata, onChangeMetaData }) => {
  const { expressions } = useTriggerUiActionServices();
  const { esqlQuery, timeWindowSize, timeWindowUnit } = ruleParams;

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
    excludeHitsFromPreviousRun: false,
  });
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [testQuery, setTestQuery] = useState<boolean>();

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
  });

  const onTestQuery = useCallback(async () => {
    const window = `${timeWindowSize}${timeWindowUnit}`;
    const emptyResult = {
      testResults: { results: [], truncated: false },
      isGrouped: true,
      timeWindow: window,
    };

    if (hasExpressionValidationErrors(currentRuleParams)) {
      return emptyResult;
    }
    const timeWindow = parseDuration(window);
    const now = Date.now();
    const table: Datatable = await fetchFieldsFromESQL(esqlQuery, expressions, {
      from: new Date(now - timeWindow).toISOString(),
      to: new Date(now).toISOString(),
    });
    if (table) {
      const esqlTable = transformDatatableToEsqlTable(table);
      const hits = toEsQueryHits(esqlTable);
      return {
        testResults: parseAggregationResults({
          isCountAgg: true,
          isGroupAgg: false,
          esResult: {
            took: 0,
            timed_out: false,
            _shards: { failed: 0, successful: 0, total: 0 },
            hits,
          },
        }),
        isGrouped: false,
        timeWindow: window,
        rawResults: {
          cols: esqlTable.columns.map((col) => ({
            id: col.name,
            field: col.name,
            name: col.name,
            actions: false,
          })),
          rows: hits.hits.slice(0, 5),
        },
      };
    }
    return emptyResult;
  }, [timeWindowSize, timeWindowUnit, currentRuleParams, esqlQuery, expressions]);

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
      <EuiSpacer size="s" />
      <TextBasedLangEditor
        query={query}
        onTextLangQueryChange={(q: AggregateQuery) => {
          setQuery(q);
          setParam('esqlQuery', q);
        }}
        expandCodeEditor={() => true}
        isCodeEditorExpanded={true}
        errors={[]}
        onTextLangQuerySubmit={() => setTestQuery(!testQuery)}
      />
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)}
        triggerTestQuery={testQuery}
        showTable
      />
    </Fragment>
  );
};
