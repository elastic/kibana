/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBasicTableColumn, EuiCallOut, EuiInMemoryTable, EuiText } from '@elastic/eui';
import {
  AlertStatus,
  ALERT_CASE_IDS,
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_START,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import moment from 'moment';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { metricValueFormatter } from '../../../common/custom_threshold_rule/metric_value_formatter';
import {
  Comparator,
  CustomMetricExpressionParams,
} from '../../../common/custom_threshold_rule/types';
import { TopAlert } from '../../typings/alerts';
import { useFetchBulkCases } from '../../hooks/use_fetch_bulk_cases';

interface AlertOverviewField {
  id: string;
  key: string;
  value?: string | string[] | number | number[];
  meta?: Record<string, any>;
}
const ColumnIDs = {
  STATUS: 'status',
  SOURCE: 'source',
  TRIGGERED: 'triggered',
  DURATION: 'duration',
  OBSERVED_VALUE: 'observed_value',
  THRESHOLD: 'threshold',
  RULE_NAME: 'rule_name',
  RULE_TYPE: 'rule_type',
  CASES: 'cases',
} as const;

const columns: Array<EuiBasicTableColumn<AlertOverviewField>> = [
  {
    field: 'key',
    name: '',
    width: '30%',
  },
  {
    field: 'value',
    name: '',
    render: (value: AlertOverviewField['value'], { id, meta }: AlertOverviewField) => {
      if (!value && !meta) return <>{'-'}</>;
      const ruleParams = meta?.ruleParams || {};
      switch (id) {
        case ColumnIDs.STATUS:
          const alertStatus = value as string;
          const flapping = meta?.flapping;
          return (
            <AlertLifecycleStatusBadge
              alertStatus={alertStatus as AlertStatus}
              flapping={flapping}
            />
          );
        case ColumnIDs.TRIGGERED:
          const triggeredDate = value as string;
          return <EuiText size="s">{moment(triggeredDate).format(meta?.dateFormat)}</EuiText>;
        case ColumnIDs.DURATION:
          const duration = value as number;
          return (
            <EuiText size="s">
              {/* duration is in μs so divide by 1000 */}
              <h4>{moment.duration(duration / 1000).humanize()}</h4>
            </EuiText>
          );
        case ColumnIDs.RULE_NAME:
          const ruleName = value as string;
          return <EuiText size="s">{ruleName}</EuiText>;
        case ColumnIDs.OBSERVED_VALUE:
          const observedValues = value as number[];
          return (
            <div>
              {observedValues.map((observedValue, metricIndex) => {
                const criteria = ruleParams.criteria[metricIndex] as CustomMetricExpressionParams;
                const field = criteria.metrics[0].field;
                const isRangeThreshold =
                  criteria.comparator === Comparator.OUTSIDE_RANGE ||
                  criteria.comparator === Comparator.BETWEEN;
                const threshold = criteria.threshold[0];
                const formattedValue = metricValueFormatter(observedValue, field);
                return (
                  <EuiText size="s" key={`${observedValue}-${metricIndex}`}>
                    <h4 style={{ display: 'inline' }}>{formattedValue}</h4>
                    {!isRangeThreshold && (
                      <span>{` (${Math.floor(
                        (observedValue * 100) / threshold
                      )}% above the threshold)`}</span>
                    )}
                  </EuiText>
                );
              })}
              {observedValues.length > 1 && (
                <EuiCallOut size="s" title="Multiple conditions" iconType="alert" />
              )}
            </div>
          );

        case ColumnIDs.THRESHOLD:
          const params = ruleParams.criteria as CustomMetricExpressionParams[];
          return (
            <div>
              {params.map((criteria, metricIndex) => {
                const field = criteria.metrics[0].field;
                const isRangeThreshold =
                  criteria.comparator === Comparator.OUTSIDE_RANGE ||
                  criteria.comparator === Comparator.BETWEEN;
                const comparator = criteria.comparator;

                if (isRangeThreshold) {
                  const rangeThresholdFormattedAsString = criteria.threshold
                    .map((threshold) => metricValueFormatter(threshold, field))
                    .join(' AND ');
                  return (
                    <EuiText size="s" key={`${rangeThresholdFormattedAsString}-${metricIndex}`}>
                      <h4>{`${comparator.toUpperCase()} ${rangeThresholdFormattedAsString}`}</h4>
                    </EuiText>
                  );
                }
                return criteria.threshold.map((threshold, index) => {
                  const formattedValue = metricValueFormatter(threshold, field);
                  return (
                    <EuiText size="s" key={`${threshold}-${metricIndex}`}>
                      <h4>{`${comparator} ${formattedValue}`}</h4>
                    </EuiText>
                  );
                });
              })}
            </div>
          );

        case ColumnIDs.RULE_TYPE:
          const ruleType = value as string;
          return <EuiText size="s">{ruleType}</EuiText>;
        case ColumnIDs.CASES:
          const cases = value as string;
          return <EuiText size="s">{cases}</EuiText>;
        default:
          return <>{'-'}</>;
      }
    },
  },
];
export const Overview = memo(({ alert }: { alert: TopAlert }) => {
  const { cases } = useFetchBulkCases({ ids: alert.fields[ALERT_CASE_IDS] || [] });
  const dateFormat = useUiSetting<string>('dateFormat');
  const items = useMemo(() => {
    return [
      {
        id: ColumnIDs.STATUS,
        key: 'Status',
        value: alert.fields[ALERT_STATUS],
        meta: {
          flapping: alert.fields[ALERT_FLAPPING],
        },
      },
      {
        id: ColumnIDs.SOURCE,
        key: 'Affected entity / source',
        value: 'TODO',
      },
      {
        id: ColumnIDs.TRIGGERED,
        key: 'Triggered',
        value: alert.fields[ALERT_START],
        meta: {
          dateFormat,
        },
      },
      {
        id: ColumnIDs.DURATION,
        key: 'Duration',
        value: alert.fields[ALERT_DURATION],
      },
      {
        id: ColumnIDs.OBSERVED_VALUE,
        key: 'Observed value',
        value: alert.fields[ALERT_EVALUATION_VALUES],
        meta: {
          ruleParams: alert.fields[ALERT_RULE_PARAMETERS],
        },
      },
      {
        id: ColumnIDs.THRESHOLD,
        key: 'Threshold',
        value: alert.fields[ALERT_EVALUATION_THRESHOLD],
        meta: {
          ruleParams: alert.fields[ALERT_RULE_PARAMETERS],
        },
      },
      {
        id: ColumnIDs.RULE_NAME,
        key: 'Rule name',
        value: alert.fields[ALERT_RULE_NAME],
      },
      {
        id: ColumnIDs.RULE_TYPE,
        key: 'Rule type',
        value: alert.fields[ALERT_RULE_CATEGORY],
      },
      {
        id: ColumnIDs.CASES,
        key: 'Cases',
        value: cases.map((fetchedCase) => fetchedCase.title).join(', '),
      },
    ];
  }, [alert.fields, cases, dateFormat]);
  return <EuiInMemoryTable width={'80%'} columns={columns} itemId="key" items={items} />;
});
