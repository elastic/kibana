/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { debounce, get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { getFields, RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import { AggregateQuery, getIndexPatternFromESQLQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  FieldOption,
  firstFieldOption,
  getTimeFieldOptions,
  getTimeOptions,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { SourceFields } from '../../components/source_fields_select';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { rowToDocument, toEsQueryHits, transformDatatableToEsqlTable } from '../../../../common';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors }) => {
  const { expressions, http } = useTriggerUiActionServices();
  const { esqlQuery, timeWindowSize, timeWindowUnit, timeField, sourceFields } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    // ESQL queries compare conditions within the ES query
    // so only 'met' results are returned, therefore the threshold should always be 0
    threshold: [0],
    thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: DEFAULT_VALUES.SIZE,
    esqlQuery: esqlQuery ?? { esql: '' },
    aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: DEFAULT_VALUES.GROUP_BY,
    termSize: DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esqlQuery,
    sourceFields: sourceFields ?? DEFAULT_VALUES.SOURCE_FIELDS,
  });
  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [detectTimestamp, setDetectTimestamp] = useState<boolean>(false);
  const [esFields, setEsFields] = useState<FieldOption[]>([]);

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
    if (esqlQuery && 'esql' in esqlQuery) {
      if (esqlQuery.esql) {
        refreshTimeFields(esqlQuery);
        refreshEsFields(esqlQuery, false);
      }
    }
    if (timeField) {
      setTimeFieldOptions([firstFieldOption, { text: timeField, value: timeField }]);
    }
  };
  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          })),
          rows: esqlTable.values.slice(0, 5).map((row) => rowToDocument(esqlTable.columns, row)),
        },
      };
    }
    return emptyResult;
  }, [timeWindowSize, timeWindowUnit, currentRuleParams, esqlQuery, expressions]);

  const refreshTimeFields = async (q: AggregateQuery) => {
    let hasTimestamp = false;
    const indexPattern: string = getIndexPatternFromESQLQuery(get(q, 'esql'));
    const currentEsFields = await getFields(http, [indexPattern]);

    const timeFields = getTimeFieldOptions(currentEsFields);
    setTimeFieldOptions([firstFieldOption, ...timeFields]);

    const timestampField = timeFields.find((field) => field.value === '@timestamp');
    if (timestampField) {
      setParam('timeField', timestampField.value);
      hasTimestamp = true;
    }
    setDetectTimestamp(hasTimestamp);
  };

  const refreshEsFields = async (q: AggregateQuery, resetSourceFields: boolean = true) => {
    let fields: FieldOption[] = [];
    try {
      const table = await fetchFieldsFromESQL({ esql: `${get(q, 'esql')} | limit 0` }, expressions);
      if (table) {
        fields = table.columns.map((c) => ({
          name: c.id,
          type: c.meta.type,
          normalizedType: c.meta.type,
          searchable: true,
          aggregatable: true,
        }));
      }
    } catch (error) {
      /** ignore error */
    }

    if (resetSourceFields) {
      setParam('sourceFields', undefined);
    }
    setEsFields(fields);
  };

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.defineEsqlQueryPrompt"
            defaultMessage="Define your query using ES|QL"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow id="queryEditor" data-test-subj="queryEsqlEditor" fullWidth>
        <TextBasedLangEditor
          query={query}
          onTextLangQueryChange={debounce((q: AggregateQuery) => {
            setQuery(q);
            setParam('esqlQuery', q);
            refreshTimeFields(q);
            refreshEsFields(q);
          }, 1000)}
          expandCodeEditor={() => true}
          isCodeEditorExpanded={true}
          onTextLangQuerySubmit={() => {}}
          detectTimestamp={detectTimestamp}
          hideMinimizeButton={true}
          hideRunQueryText={true}
        />
      </EuiFormRow>
      <SourceFields
        onChangeSourceFields={(selectedSourceFields) =>
          setParam('sourceFields', selectedSourceFields)
        }
        esFields={esFields}
        sourceFields={sourceFields}
        errors={errors.sourceFields}
      />
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectEsqlQueryTimeFieldPrompt"
            defaultMessage="Select a time field"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        id="timeField"
        fullWidth
        isInvalid={errors.timeField.length > 0 && timeField !== undefined}
        error={errors.timeField}
      >
        <EuiSelect
          options={timeFieldOptions}
          isInvalid={errors.timeField.length > 0 && timeField !== undefined}
          fullWidth
          name="timeField"
          data-test-subj="timeFieldSelect"
          value={timeField || ''}
          onChange={(e) => {
            setParam('timeField', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.setEsqlQueryTimeWindowPrompt"
            defaultMessage="Set the time window"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeWindowSize"
            isInvalid={errors.timeWindowSize.length > 0}
            error={errors.timeWindowSize}
          >
            <EuiFieldNumber
              name="timeWindowSize"
              data-test-subj="timeWindowSizeNumber"
              isInvalid={errors.timeWindowSize.length > 0}
              min={0}
              value={timeWindowSize || ''}
              onChange={(e) => {
                const { value } = e.target;
                const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                setParam('timeWindowSize', timeWindowSizeVal);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow id="timeWindowUnit">
            <EuiSelect
              name="timeWindowUnit"
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                setParam('timeWindowUnit', e.target.value);
              }}
              options={getTimeOptions(timeWindowSize ?? 1)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)}
        showTable
      />
    </Fragment>
  );
};
