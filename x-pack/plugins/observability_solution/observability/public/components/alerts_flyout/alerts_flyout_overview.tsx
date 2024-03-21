/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTableColumn,
  EuiCallOut,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import {
  AlertStatus,
  ALERT_CASE_IDS,
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import moment from 'moment';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { CaseStatuses, Tooltip as CaseTooltip } from '@kbn/cases-components';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { paths } from '../../../common/locators/paths';
import { metricValueFormatter } from '../../../common/custom_threshold_rule/metric_value_formatter';
import {
  Comparator,
  CustomMetricExpressionParams,
  Group,
  TimeRange,
} from '../../../common/custom_threshold_rule/types';
import { TopAlert } from '../../typings/alerts';
import { Case, Cases, useFetchBulkCases } from '../../hooks/use_fetch_bulk_cases';
import { NavigateToCaseView, useCaseViewNavigation } from '../../hooks/use_case_view_navigation';
import { useKibana } from '../../utils/kibana_react';
import { Groups } from '../custom_threshold/components/alert_details_app_section/groups';

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

export interface CaseTooltipContentProps {
  title: string;
  description: string;
  status: CaseStatuses;
  totalComments: number;
  createdAt: string;
  createdBy: { username?: string; fullName?: string };
}
const formatCase = (theCase: Case): CaseTooltipContentProps => ({
  title: theCase.title,
  description: theCase.description,
  createdAt: theCase.created_at,
  createdBy: {
    username: theCase.created_by.username ?? undefined,
    fullName: theCase.created_by.full_name ?? undefined,
  },
  status: theCase.status,
  totalComments: theCase.totalComment,
});
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
export const Overview = memo(({ alert }: { alert: TopAlert }) => {
  const { http } = useKibana().services;
  const { cases, isLoading } = useFetchBulkCases({ ids: alert.fields[ALERT_CASE_IDS] || [] });
  const dateFormat = useUiSetting<string>('dateFormat');
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const groups = alert.fields[ALERT_GROUP_FIELD]?.map((field, index) => {
    const values = alert.fields[ALERT_GROUP_VALUE];
    if (values?.length && values[index]) {
      return { field, value: values[index] };
    }
  });
  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);
  const { navigateToCaseView } = useCaseViewNavigation();
  const items = useMemo(() => {
    return [
      {
        id: ColumnIDs.STATUS,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.status', {
          defaultMessage: 'Status',
        }),
        value: alert.fields[ALERT_STATUS],
        meta: {
          flapping: alert.fields[ALERT_FLAPPING],
        },
      },
      {
        id: ColumnIDs.SOURCE,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.sources', {
          defaultMessage: 'Affected entity / source',
        }),
        value: [],
        meta: {
          alertEnd,
          timeRange,
          groups: groups || [],
        },
      },
      {
        id: ColumnIDs.TRIGGERED,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.triggered', {
          defaultMessage: 'Triggered',
        }),
        value: alert.fields[ALERT_START],
        meta: {
          dateFormat,
        },
      },
      {
        id: ColumnIDs.DURATION,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.duration', {
          defaultMessage: 'Duration',
        }),
        value: alert.fields[ALERT_DURATION],
      },
      {
        id: ColumnIDs.OBSERVED_VALUE,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.observedValue', {
          defaultMessage: 'Observed value',
        }),
        value: alert.fields[ALERT_EVALUATION_VALUES],
        meta: {
          ruleParams: alert.fields[ALERT_RULE_PARAMETERS],
        },
      },
      {
        id: ColumnIDs.THRESHOLD,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.threshold', {
          defaultMessage: 'Threshold',
        }),
        value: alert.fields[ALERT_EVALUATION_THRESHOLD],
        meta: {
          ruleParams: alert.fields[ALERT_RULE_PARAMETERS],
        },
      },
      {
        id: ColumnIDs.RULE_NAME,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.ruleName', {
          defaultMessage: 'Rule name',
        }),
        value: alert.fields[ALERT_RULE_NAME],
        meta: {
          ruleLink:
            alert.fields[ALERT_RULE_UUID] &&
            http.basePath.prepend(paths.observability.ruleDetails(alert.fields[ALERT_RULE_UUID])),
        },
      },
      {
        id: ColumnIDs.RULE_TYPE,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.ruleType', {
          defaultMessage: 'Rule type',
        }),
        value: alert.fields[ALERT_RULE_CATEGORY],
      },
      {
        id: ColumnIDs.CASES,
        key: i18n.translate('xpack.observability.alertFlyout.overviewTab.cases', {
          defaultMessage: 'Cases',
        }),
        value: [],
        meta: {
          cases,
          navigateToCaseView,
          isLoading,
        },
      },
    ];
  }, [
    alert.fields,
    alertEnd,
    cases,
    dateFormat,
    groups,
    http.basePath,
    isLoading,
    navigateToCaseView,
    timeRange,
  ]);
  return <EuiInMemoryTable width={'80%'} columns={columns} itemId="key" items={items} />;
});
