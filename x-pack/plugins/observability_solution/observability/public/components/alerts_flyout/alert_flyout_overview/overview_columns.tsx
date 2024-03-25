/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiCallOut, EuiLink, EuiSkeletonText, EuiText } from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import { Cases } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { AlertStatus } from '@kbn/rule-data-utils';
import moment from 'moment';
import React from 'react';
import { Tooltip as CaseTooltip } from '@kbn/cases-components';
import type { Group } from '../../../../common/custom_threshold_rule/types';
import { NavigateToCaseView } from '../../../hooks/use_case_view_navigation';
import { metricValueFormatter } from '../../../../common/custom_threshold_rule/metric_value_formatter';
import { Groups } from '../../custom_threshold/components/alert_details_app_section/groups';
import { formatCase } from './helpers/format_cases';
import { isFieldsSameType } from './helpers/is_fields_same_type';
import { FlyoutThresholdData } from './helpers/map_rules_params_with_flyout';

interface AlertOverviewField {
  id: string;
  key: string;
  value?: string | string[] | number | number[] | Record<string, any>;
  meta?: Record<string, any>;
}
export const ColumnIDs = {
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

export const overviewColumns: Array<EuiBasicTableColumn<AlertOverviewField>> = [
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
      const ruleCriteria = meta?.ruleCriteria as FlyoutThresholdData[];
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

        case ColumnIDs.SOURCE:
          const groups = meta?.groups as Group[];
          if (!groups.length) return <>{'-'}</>;
          const alertEnd = meta?.alertEnd;
          const timeRange = meta?.timeRange;
          return (
            <Groups
              groups={groups}
              timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }}
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
          const ruleLink = meta?.ruleLink as string;
          return (
            <EuiLink data-test-subj="alertFlyoutOverview" href={ruleLink ? ruleLink : '#'}>
              {ruleName}
            </EuiLink>
          );
        case ColumnIDs.OBSERVED_VALUE:
          if (!ruleCriteria.length) return <>{'-'}</>;
          return (
            <div>
              {ruleCriteria.map((criteria, criteriaIndex) => {
                const fields = criteria.fields;
                const observedValue = criteria.observedValue;
                const threshold = criteria.threshold;
                const isRangeThreshold = threshold.length > 1;
                const isSameFieldsType = isFieldsSameType(fields);
                const formattedValue = metricValueFormatter(
                  observedValue,
                  isSameFieldsType ? fields[0] : 'noType'
                );
                return (
                  <EuiText size="s" key={`${observedValue}-${criteriaIndex}`}>
                    <h4 style={{ display: 'inline' }}>{formattedValue}</h4>
                    {isRangeThreshold ? (
                      <span>
                        {i18n.translate(
                          'xpack.observability.alertFlyout.overview.rangeThresholdLabel',
                          { defaultMessage: ' (Range threshold)' }
                        )}
                      </span>
                    ) : (
                      <span>
                        {i18n.translate(
                          'xpack.observability.alertFlyout.overview.aboveThresholdLabel',
                          {
                            defaultMessage: ' ({pctValue}% above the threshold)',
                            values: {
                              pctValue: Math.floor((observedValue * 100) / threshold[0]),
                            },
                          }
                        )}
                      </span>
                    )}
                  </EuiText>
                );
              })}
              {ruleCriteria.length > 1 && (
                <EuiCallOut
                  size="s"
                  title={i18n.translate(
                    'xpack.observability.columns.euiCallOut.multipleConditionsLabel',
                    { defaultMessage: 'Multiple conditions' }
                  )}
                  iconType="alert"
                />
              )}
            </div>
          );

        case ColumnIDs.THRESHOLD:
          if (!ruleCriteria.length) return <>{'-'}</>;
          return (
            <div>
              {ruleCriteria.map((criteria, criticalIndex) => {
                const fields = criteria.fields;
                const threshold = criteria.threshold;
                const isRangeThreshold = threshold.length > 1;
                const isSameFieldsType = isFieldsSameType(fields);
                const comparator = criteria.comparator;
                if (isRangeThreshold) {
                  const rangeThresholdFormattedAsString = threshold
                    .map((thresholdWithRange) =>
                      metricValueFormatter(
                        thresholdWithRange,
                        isSameFieldsType ? fields[0] : 'noType'
                      )
                    )
                    .join(' AND ');
                  return (
                    <EuiText size="s" key={`${rangeThresholdFormattedAsString}-${criticalIndex}`}>
                      <h4>{`${comparator.toUpperCase()} ${rangeThresholdFormattedAsString}`}</h4>
                    </EuiText>
                  );
                }
                return criteria.threshold.map((thresholdWithRange) => {
                  const formattedValue = metricValueFormatter(thresholdWithRange, fields[0]);
                  return (
                    <EuiText size="s" key={`${thresholdWithRange}-${criticalIndex}`}>
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
          const cases = meta?.cases as Cases;
          const isLoading = meta?.isLoading as boolean;
          const navigateToCaseView = meta?.navigateToCaseView as NavigateToCaseView;
          return (
            <EuiSkeletonText
              isLoading={isLoading}
              lines={1}
              size="s"
              data-test-subj="cases-cell-loading"
            >
              {cases.length ? (
                cases.map((caseInfo, index) => {
                  return [
                    index > 0 && index < cases.length && ', ',
                    <CaseTooltip loading={false} content={formatCase(caseInfo)} key={caseInfo.id}>
                      <EuiLink
                        key={caseInfo.id}
                        onClick={() => navigateToCaseView({ caseId: caseInfo.id })}
                        data-test-subj="o11yAlertFlyoutOverviewTabCasesLink"
                      >
                        {caseInfo.title}
                      </EuiLink>
                    </CaseTooltip>,
                  ];
                })
              ) : (
                <>{'-'}</>
              )}
            </EuiSkeletonText>
          );
        default:
          return <>{'-'}</>;
      }
    },
  },
];
