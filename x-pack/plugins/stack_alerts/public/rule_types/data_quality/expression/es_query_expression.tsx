/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
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
import { useTriggerUiActionServices } from '../util';

const { useXJsonMode } = XJson;

export const EsQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data }) => {
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
    groupBy,
    termSize,
    excludeHitsFromPreviousRun,
  } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<EsQueryRuleParams>({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
    thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: size ?? DEFAULT_VALUES.SIZE,
    esQuery: esQuery ?? DEFAULT_VALUES.QUERY,
    aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
    termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esQuery,
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

  const services = useTriggerUiActionServices();
  const { http } = services;

  const [esFields, setEsFields] = useState<FieldOption[]>([]);

  const setDefaultExpressionValues = async () => {
    setRuleProperty('params', currentRuleParams);

    if (index && index.length > 0) {
      await refreshEsFields(index);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshEsFields = async (indices: string[]) => {
    const currentEsFields = await getFields(http, indices);
    setEsFields(currentEsFields);
  };

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectIndexPrompt"
            defaultMessage="Select an index and time field"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <IndexSelectPopover
        index={index}
        data-test-subj="indexSelectPopover"
        esFields={esFields}
        timeField={timeField}
        errors={errors}
        onIndexChange={async (indices: string[]) => {
          setParam('index', indices);

          // reset expression fields if indices are deleted
          if (indices.length === 0) {
            setRuleProperty('params', {
              timeField: ruleParams.timeField,
              index: indices,
              esQuery: DEFAULT_VALUES.QUERY,
              size: DEFAULT_VALUES.SIZE,
              thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
              timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
              timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
              threshold: DEFAULT_VALUES.THRESHOLD,
              aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
              groupBy: DEFAULT_VALUES.GROUP_BY,
              termSize: DEFAULT_VALUES.TERM_SIZE,
              searchType: SearchType.esQuery,
              excludeHitsFromPreviousRun: DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
            });
          } else {
            await refreshEsFields(indices);
          }
        }}
        onTimeFieldChange={(updatedTimeField: string) => setParam('timeField', updatedTimeField)}
      />

      <EuiSpacer size="s" />

      {/* <RuleCommonExpressions */}
      {/*   threshold={threshold ?? DEFAULT_VALUES.THRESHOLD} */}
      {/*   thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR} */}
      {/*   timeWindowSize={timeWindowSize} */}
      {/*   timeWindowUnit={timeWindowUnit} */}
      {/*   size={size} */}
      {/*   esFields={esFields} */}
      {/*   aggType={aggType} */}
      {/*   aggField={aggField} */}
      {/*   groupBy={groupBy} */}
      {/*   termSize={termSize} */}
      {/*   termField={termField} */}
      {/*   onChangeSelectedAggField={useCallback( */}
      {/*     (selectedAggField?: string) => setParam('aggField', selectedAggField), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeSelectedAggType={useCallback( */}
      {/*     (selectedAggType: string) => setParam('aggType', selectedAggType), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeSelectedGroupBy={useCallback( */}
      {/*     (selectedGroupBy) => setParam('groupBy', selectedGroupBy), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeSelectedTermField={useCallback( */}
      {/*     (selectedTermField) => setParam('termField', selectedTermField), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeSelectedTermSize={useCallback( */}
      {/*     (selectedTermSize?: number) => setParam('termSize', selectedTermSize), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeThreshold={useCallback( */}
      {/*     (selectedThresholds) => setParam('threshold', selectedThresholds), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeThresholdComparator={useCallback( */}
      {/*     (selectedThresholdComparator) => */}
      {/*       setParam('thresholdComparator', selectedThresholdComparator), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeWindowSize={useCallback( */}
      {/*     (selectedWindowSize: number | undefined) => */}
      {/*       setParam('timeWindowSize', selectedWindowSize), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeWindowUnit={useCallback( */}
      {/*     (selectedWindowUnit: string) => setParam('timeWindowUnit', selectedWindowUnit), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   onChangeSizeValue={useCallback( */}
      {/*     (updatedValue) => setParam('size', updatedValue), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/*   errors={errors} */}
      {/*   hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)} */}
      {/*   excludeHitsFromPreviousRun={excludeHitsFromPreviousRun} */}
      {/*   onChangeExcludeHitsFromPreviousRun={useCallback( */}
      {/*     (exclude) => setParam('excludeHitsFromPreviousRun', exclude), */}
      {/*     [setParam] */}
      {/*   )} */}
      {/* /> */}

      <EuiSpacer />
    </Fragment>
  );
};
