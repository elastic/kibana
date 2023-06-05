/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCheckbox,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import { AggregateQuery } from '@kbn/es-query';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { parseDuration } from '@kbn/alerting-plugin/common';
import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/public/common';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { toEsResult, useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data, metadata, onChangeMetaData }) => {
  const { expressions } = useTriggerUiActionServices();
  const { esqlQuery, excludeHitsFromPreviousRun, alertId, timeWindowSize, timeWindowUnit } =
    ruleParams;

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
    alertId,
  });
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [selectedAlertId, setSelectedAlertId] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [columns, setColumns] = useState<DatatableColumn[]>([]);
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
    setSelectedAlertId(alertId ? [{ label: alertId }] : []);
    refreshOptions();
  };
  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshOptions = async () => {
    if (query.esql) {
      const q = {
        esql: `${query.esql} | limit 0`,
      };
      try {
        const table = await fetchFieldsFromESQL(q, expressions);
        setColumns(table?.columns ?? []);
      } catch (e) {
        /*
         * Catch and ignore error
         */
      }
    }
  };

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
    const table = await fetchFieldsFromESQL(esqlQuery, expressions, {
      from: new Date(now - timeWindow).toISOString(),
      to: new Date(now).toISOString(),
    });
    const id = selectedAlertId.length > 0 ? selectedAlertId[0].label : undefined;

    return table
      ? {
          testResults: parseAggregationResults({
            isCountAgg: false,
            isGroupAgg: true,
            esResult: {
              took: 0,
              timed_out: false,
              _shards: { failed: 0, successful: 0, total: 0 },
              hits: { hits: [] },
              aggregations: toEsResult(table, id),
            },
          }),
          isGrouped: id !== undefined,
          timeWindow: window,
        }
      : emptyResult;
  }, [timeWindowSize, timeWindowUnit, currentRuleParams, esqlQuery, selectedAlertId, expressions]);

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
          refreshOptions();
        }}
        expandCodeEditor={() => true}
        isCodeEditorExpanded={true}
        errors={[]}
        disableExpandToggle={true}
        onTextLangQuerySubmit={() => setTestQuery(!testQuery)}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectAlertIdPrompt"
            defaultMessage="Select alert ID field"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow>
        <EuiComboBox
          aria-label="Select an alert ID"
          placeholder="Select an alert ID"
          singleSelection={{ asPlainText: true }}
          options={columns.map((c) => ({ label: c.name }))}
          selectedOptions={selectedAlertId}
          onChange={useCallback(
            (selectedOptions) => {
              setSelectedAlertId(selectedOptions);
              const option = selectedOptions.length > 0 ? selectedOptions[0].label : undefined;
              setParam('alertId', option);
            },
            [setParam]
          )}
          isDisabled={false}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow>
        <EuiCheckbox
          data-test-subj="excludeHitsFromPreviousRunExpression"
          checked={excludeHitsFromPreviousRun}
          id="excludeHitsFromPreviousRunExpressionId"
          onChange={useCallback(
            (event) => setParam('excludeHitsFromPreviousRun', event.target.checked),
            [setParam]
          )}
          label={i18n.translate('xpack.stackAlerts.esQuery.ui.excludePreviousHitsExpression', {
            defaultMessage: 'Exclude matches from previous runs',
          })}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)}
        triggerTestQuery={testQuery}
      />
    </Fragment>
  );
};
