/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFormRow, EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { getFields, RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  FieldOption,
  buildAggregation,
  parseAggregationResults,
  isGroupAggregation,
  isCountAggregation,
  BUCKET_SELECTOR_FIELD,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { Comparator } from '../../../../common/comparator_types';
import { getComparatorScript } from '../../../../common';
import { hasExpressionValidationErrors } from '../validation';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { IndexSelectPopover } from '../../components/index_select_popover';
import { DEFAULT_VALUES } from '../constants';
import { RuleCommonExpressions } from '../rule_common_expressions';
import { convertFieldSpecToFieldOption, useTriggerUiActionServices } from '../util';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { AggregateQuery } from '@kbn/es-query';
import { DataViewSelectPopover } from '../../components/data_view_select_popover';
import { DataView } from '@kbn/data-views-plugin/common';

const { useXJsonMode } = XJson;

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data, metadata, onChangeMetaData }) => {
  const {
    index,
    timeField,
    esQuery,
    size,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    excludeHitsFromPreviousRun,
  } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: size ?? DEFAULT_VALUES.SIZE,
    esQuery: esQuery ?? { esql: '' },
    aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
    termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esqlQuery,
    excludeHitsFromPreviousRun: excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
  });

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

  // const services = useTriggerUiActionServices();
  // const { http, docLinks } = services;

  const [esFields, setEsFields] = useState<FieldOption[]>(
    index ? convertFieldSpecToFieldOption(index.fields.map((field) => field.toSpec())) : []
  );

  const [esqlQuery, setEsqlQuery] = useState<AggregateQuery>({ esql: '' });
  const [dataView, setDataView] = useState<DataView>(index);
  const setDefaultExpressionValues = async () => {
    setRuleProperty('params', currentRuleParams);
    setEsqlQuery(esQuery ?? { esql: '' });
    const defaultDataView = await data.dataViews.getDefaultDataView();
    if (!index && defaultDataView) {
      setDataView(defaultDataView);
      setParam('index', defaultDataView);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dataView) {
      setEsqlQuery({ esql: `from ${dataView.getIndexPattern()} | limit 10` });
      setEsFields(convertFieldSpecToFieldOption(dataView.fields.map((field) => field.toSpec())));
      setParam('timeField', dataView.timeFieldName);
    }
  }, [dataView]);

  const onTestQuery = useCallback(async () => {
    const isGroupAgg = isGroupAggregation(termField);
    const isCountAgg = isCountAggregation(aggType);
    const window = `${timeWindowSize}${timeWindowUnit}`;
    if (hasExpressionValidationErrors(currentRuleParams)) {
      return {
        testResults: { results: [], truncated: false },
        isGrouped: isGroupAgg,
        timeWindow: window,
      };
    }
    const timeWindow = parseDuration(window);
    // const parsedQuery = JSON.parse(esQuery);
    const now = Date.now();
    const { rawResponse } = await lastValueFrom(
      data.search.search({
        params: buildSortedEventsQuery({
          index: index.matchedIndices,
          from: new Date(now - timeWindow).toISOString(),
          to: new Date(now).toISOString(),
          filter: '', // parsedQuery.query,
          size: 0,
          searchAfterSortId: undefined,
          timeField: timeField ? timeField : '',
          track_total_hits: true,
          aggs: buildAggregation({
            aggType,
            aggField,
            termField,
            termSize,
            condition: {
              conditionScript: getComparatorScript(
                (thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR) as Comparator,
                threshold,
                BUCKET_SELECTOR_FIELD
              ),
            },
          }),
        }),
      })
    );

    return {
      testResults: parseAggregationResults({ isCountAgg, isGroupAgg, esResult: rawResponse }),
      isGrouped: isGroupAgg,
      timeWindow: window,
    };
  }, [
    timeWindowSize,
    timeWindowUnit,
    currentRuleParams,
    esQuery,
    data.search,
    index,
    timeField,
    aggType,
    aggField,
    termField,
    termSize,
    threshold,
    thresholdComparator,
  ]);

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectDataViewPrompt"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DataViewSelectPopover
        dataView={dataView}
        metadata={metadata}
        onSelectDataView={(newDataView: DataView) => {
          setParam('index', newDataView);
          setDataView(newDataView);
        }}
        onChangeMetaData={onChangeMetaData}
      />
      {Boolean(index?.id) && (
        <>
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.defineEsqlQueryPrompt"
                defaultMessage="Define your query using ESQL"
              />
            </h5>
          </EuiTitle>
          {JSON.stringify(esqlQuery)}
          <TextBasedLangEditor
            query={esqlQuery}
            onTextLangQueryChange={(query: AggregateQuery) => {
              setEsqlQuery(query);
              setParam('esQuery', query);
            }}
            expandCodeEditor={(status: boolean) => true}
            isCodeEditorExpanded={true}
            errors={[]}
            onTextLangQuerySubmit={() => {}}
          />
        </>
      )}
      <EuiSpacer size="s" />
      <RuleCommonExpressions
        threshold={threshold ?? DEFAULT_VALUES.THRESHOLD}
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        size={size}
        esFields={esFields}
        aggType={aggType}
        aggField={aggField}
        groupBy={groupBy}
        termSize={termSize}
        termField={termField}
        onChangeSelectedAggField={useCallback(
          (selectedAggField?: string) => setParam('aggField', selectedAggField),
          [setParam]
        )}
        onChangeSelectedAggType={useCallback(
          (selectedAggType: string) => setParam('aggType', selectedAggType),
          [setParam]
        )}
        onChangeSelectedGroupBy={useCallback(
          (selectedGroupBy) => setParam('groupBy', selectedGroupBy),
          [setParam]
        )}
        onChangeSelectedTermField={useCallback(
          (selectedTermField) => setParam('termField', selectedTermField),
          [setParam]
        )}
        onChangeSelectedTermSize={useCallback(
          (selectedTermSize?: number) => setParam('termSize', selectedTermSize),
          [setParam]
        )}
        onChangeThreshold={useCallback(
          (selectedThresholds) => setParam('threshold', selectedThresholds),
          [setParam]
        )}
        onChangeThresholdComparator={useCallback(
          (selectedThresholdComparator) =>
            setParam('thresholdComparator', selectedThresholdComparator),
          [setParam]
        )}
        onChangeWindowSize={useCallback(
          (selectedWindowSize: number | undefined) =>
            setParam('timeWindowSize', selectedWindowSize),
          [setParam]
        )}
        onChangeWindowUnit={useCallback(
          (selectedWindowUnit: string) => setParam('timeWindowUnit', selectedWindowUnit),
          [setParam]
        )}
        onChangeSizeValue={useCallback(
          (updatedValue) => setParam('size', updatedValue),
          [setParam]
        )}
        errors={errors}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)}
        onTestFetch={onTestQuery}
        excludeHitsFromPreviousRun={excludeHitsFromPreviousRun}
        onChangeExcludeHitsFromPreviousRun={useCallback(
          (exclude) => setParam('excludeHitsFromPreviousRun', exclude),
          [setParam]
        )}
      />
      <EuiSpacer />
    </Fragment>
  );
};
