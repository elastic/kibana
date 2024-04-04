/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { LEGACY_LIGHT_THEME } from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import {
  ALERT_CONTEXT,
  ALERT_END,
  ALERT_EVALUATION_VALUE,
  ALERT_START,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import { useTheme } from '@emotion/react';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Group } from '@kbn/observability-alert-details';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { get, identity } from 'lodash';
import { useLogView } from '@kbn/logs-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import {
  Comparator,
  ComparatorToi18nMap,
  ComparatorToi18nSymbolsMap,
  isRatioRule,
  type PartialCriterion,
} from '../../../../../common/alerting/logs/log_threshold';
import { AlertDetailsAppSectionProps } from './types';
import { Threshold } from '../../../common/components/threshold';
import { LogRateAnalysis } from './components/log_rate_analysis';
import { LogThresholdCountChart, LogThresholdRatioChart } from './components/threhsold_chart';
import { useLicense } from '../../../../hooks/use_license';

const LogsHistoryChart = React.lazy(() => import('./components/logs_history_chart'));
const formatThreshold = (threshold: number) => String(threshold);

const AlertDetailsAppSection = ({
  rule,
  alert,
  setAlertSummaryFields,
}: AlertDetailsAppSectionProps) => {
  const { logsShared } = useKibanaContextForPlugin().services;
  const theme = useTheme();
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;
  const alertContext = alert.fields[ALERT_CONTEXT];
  const interval = `${rule.params.timeSize}${rule.params.timeUnit}`;
  const thresholdFill = convertComparatorToFill(rule.params.count.comparator);
  const filter = rule.params.groupBy
    ? rule.params.groupBy
        .map((field) => {
          const value = get(
            alert.fields[ALERT_CONTEXT],
            ['groupByKeys', ...field.split('.')],
            null
          );
          return value ? `${field} : "${value}"` : null;
        })
        .filter(identity)
        .join(' AND ')
    : '';
  const groups: Group[] | undefined = rule.params.groupBy
    ? rule.params.groupBy.flatMap((field) => {
        const value: string = get(
          alert.fields[ALERT_CONTEXT],
          ['groupByKeys', ...field.split('.')],
          null
        );
        return value ? { field, value } : [];
      })
    : undefined;

  const { derivedDataView } = useLogView({
    initialLogViewReference: rule.params.logView,
    logViews: logsShared.logViews.client,
  });

  const { hasAtLeast } = useLicense();
  const hasLicenseForLogRateAnalysis = hasAtLeast('platinum');

  useEffect(() => {
    /**
     * The `CriterionPreview` chart shows all the series/data stacked when there is a GroupBy in the rule parameters.
     * e.g., `host.name`, the chart will show stacks of data by hostname.
     * We only need the chart to show the series that is related to the selected alert.
     * The chart series are built based on the GroupBy in the rule params
     * Each series have an id which is the just a joining of fields value of the GroupBy `getChartGroupNames`
     * We filter down the series using this group name
     */
    const alertFieldsFromGroupBy =
      rule.params.groupBy?.reduce(
        (selectedFields: Record<string, any>, field) => ({
          ...selectedFields,
          ...{
            [field]: get(alertContext, ['groupByKeys', ...field.split('.')], null),
          },
        }),
        {}
      ) || {};

    const alertSummaryFields = Object.entries(alertFieldsFromGroupBy).map(([label, value]) => ({
      label,
      value,
    }));
    setAlertSummaryFields(alertSummaryFields);
  }, [alertContext, rule.params.groupBy, setAlertSummaryFields]);

  const getLogRatioChart = () => {
    if (isRatioRule(rule.params.criteria)) {
      const numeratorKql = rule.params.criteria[0]
        .map((criteria) => convertCriteriaToKQL(criteria))
        .join(' AND ');
      const denominatorKql = rule.params.criteria[1]
        .map((criteria) => convertCriteriaToKQL(criteria))
        .join(' AND ');

      return (
        <EuiPanel hasBorder={true} data-test-subj="logsRatioChartAlertDetails">
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.infra.logs.alertDetails.chart.ratioTitle', {
                    defaultMessage: 'Ratio of QUERY A TO QUERY B',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxHeight: 120 }} grow={1}>
              <EuiSpacer size="s" />
              <Threshold
                title={`Threshold breached`}
                chartProps={{ theme, baseTheme: LEGACY_LIGHT_THEME }}
                comparator={ComparatorToi18nSymbolsMap[rule.params.count.comparator]}
                id={'threshold-ratio-chart'}
                threshold={rule.params.count.value}
                value={Number(alert.fields[ALERT_EVALUATION_VALUE]?.toFixed(2))}
                valueFormatter={formatThreshold}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiSpacer size="s" />
              {derivedDataView && (
                <LogThresholdRatioChart
                  filter={filter}
                  numeratorKql={numeratorKql}
                  denominatorKql={denominatorKql}
                  threshold={{ value: rule.params.count.value, fill: thresholdFill }}
                  timeRange={timeRange}
                  alertRange={{ from: alert.start, to: alertEnd }}
                  index={{
                    pattern: derivedDataView.getIndexPattern(),
                    timestampField: derivedDataView.timeFieldName || '@timestamp',
                  }}
                  height={150}
                  interval={interval}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    } else return null;
  };

  const getLogCountChart = () => {
    if (!!rule.params.criteria && !isRatioRule(rule.params.criteria)) {
      const kql = rule.params.criteria
        .map((criteria) => convertCriteriaToKQL(criteria))
        .join(' AND ');
      const criteriaAsText = rule.params.criteria
        .map((criteria) => {
          if (!criteria.field || !criteria.comparator || !criteria.value) {
            return '';
          }
          return `${criteria.field}  ${ComparatorToi18nMap[criteria.comparator]} ${criteria.value}`;
        })
        .filter((text) => text)
        .join(' AND ');
      return (
        <EuiPanel hasBorder={true} data-test-subj={`logsCountChartAlertDetails`}>
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.infra.logs.alertDetails.chart.chartTitle', {
                    defaultMessage: 'Logs for {criteria}',
                    values: { criteria: criteriaAsText },
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxHeight: 120 }} grow={1}>
              <EuiSpacer size="s" />
              <Threshold
                title={`Threshold breached`}
                chartProps={{ theme, baseTheme: LEGACY_LIGHT_THEME }}
                comparator={ComparatorToi18nSymbolsMap[rule.params.count.comparator]}
                id="logCountThreshold"
                threshold={rule.params.count.value}
                value={Number(alert.fields[ALERT_EVALUATION_VALUE])}
                valueFormatter={formatThreshold}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              {derivedDataView && (
                <LogThresholdCountChart
                  filter={filter}
                  kql={kql}
                  threshold={{ value: rule.params.count.value, fill: thresholdFill }}
                  timeRange={timeRange}
                  alertRange={{ from: alert.start, to: alertEnd }}
                  index={{
                    pattern: derivedDataView.getIndexPattern(),
                    timestampField: derivedDataView.timeFieldName || '@timestamp',
                  }}
                  height={150}
                  interval={interval}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    } else return null;
  };

  const getLogsHistoryChart = () => {
    return (
      rule &&
      rule.params.criteria.length === 1 && (
        <EuiFlexItem>
          <LogsHistoryChart
            rule={{
              ...rule,
              params: { ...rule.params, timeSize: 12, timeUnit: 'h' },
            }}
            groups={groups}
          />
        </EuiFlexItem>
      )
    );
  };

  const getLogRateAnalysisSection = () => {
    return hasLicenseForLogRateAnalysis ? <LogRateAnalysis rule={rule} alert={alert} /> : null;
  };

  return (
    <EuiFlexGroup direction="column" data-test-subj="logsThresholdAlertDetailsPage">
      {getLogRatioChart()}
      {getLogCountChart()}
      {getLogRateAnalysisSection()}
      {getLogsHistoryChart()}
    </EuiFlexGroup>
  );
};

function convertComparatorToFill(comparator: Comparator) {
  switch (comparator) {
    case Comparator.GT:
    case Comparator.GT_OR_EQ:
      return 'above';
    default:
      return 'below';
  }
}

function convertCriteriaToKQL(criteria: PartialCriterion) {
  if (!criteria.value || !criteria.comparator || !criteria.field) {
    return '';
  }

  switch (criteria.comparator) {
    case Comparator.MATCH:
    case Comparator.EQ:
      return `${criteria.field} : "${criteria.value}"`;
    case Comparator.NOT_MATCH:
    case Comparator.NOT_EQ:
      return `NOT ${criteria.field} : "${criteria.value}"`;
    case Comparator.MATCH_PHRASE:
      return `${criteria.field} : ${criteria.value}`;
    case Comparator.NOT_MATCH_PHRASE:
      return `NOT ${criteria.field} : ${criteria.value}`;
    case Comparator.GT:
      return `${criteria.field} > ${criteria.value}`;
    case Comparator.GT_OR_EQ:
      return `${criteria.field} >= ${criteria.value}`;
    case Comparator.LT:
      return `${criteria.field} < ${criteria.value}`;
    case Comparator.LT_OR_EQ:
      return `${criteria.field} <= ${criteria.value}`;
    default:
      return '';
  }
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
