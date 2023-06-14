/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiRadioGroup,
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
import { rowToDocument, toEsResult, useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';

const ALL_DOCUMENTS = 'allDocuments';
const ALERT_ID = 'alertId';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data, metadata, onChangeMetaData }) => {
  const { expressions } = useTriggerUiActionServices();
  const { esqlQuery, alertId, timeWindowSize, timeWindowUnit } = ruleParams;

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
    alertId,
  });
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [selectedAlertId, setSelectedAlertId] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [columns, setColumns] = useState<DatatableColumn[]>([]);
  const [testQuery, setTestQuery] = useState<boolean>();
  const [radioIdSelected, setRadioIdSelected] = useState(ALL_DOCUMENTS);
  const alertingOptions = [
    {
      id: ALL_DOCUMENTS,
      label: 'Create one alert when matches are found',
    },
    {
      id: ALERT_ID,
      label: 'Create one alert per group',
    },
  ];

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
    setSelectedAlertId(alertId ? alertId.map((a) => ({ label: a })) : []);
    if (alertId) {
      setRadioIdSelected(ALERT_ID);
    }
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
    const id = selectedAlertId.length > 0 ? selectedAlertId.map((s) => s.label) : undefined;

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
          rawResults: {
            cols: table.columns.map((col) => ({
              id: col.id,
              field: col.id,
              name: col.name,
              actions: false,
            })),
            rows: table.rows.slice(0, 5).map((row) => rowToDocument(table.columns, row)),
          },
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
        onTextLangQuerySubmit={() => setTestQuery(!testQuery)}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectAlertGroupPrompt"
            defaultMessage="Select alert group"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiRadioGroup
        options={alertingOptions}
        idSelected={radioIdSelected}
        onChange={(optionId) => {
          setRadioIdSelected(optionId);
          if (optionId === ALL_DOCUMENTS) {
            setParam('alertId', undefined);
            setSelectedAlertId([]);
          }
        }}
      />
      {radioIdSelected === ALERT_ID && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow>
            <EuiComboBox
              placeholder="Select alert group field"
              isClearable={true}
              options={columns.map((c) => ({ label: c.name }))}
              selectedOptions={selectedAlertId}
              onChange={(selectedOptions) => {
                setSelectedAlertId(selectedOptions);
                const option =
                  selectedOptions.length > 0 ? selectedOptions.map((s) => s.label) : undefined;
                setParam('alertId', option);
              }}
              isDisabled={false}
            />
          </EuiFormRow>
        </>
      )}
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
