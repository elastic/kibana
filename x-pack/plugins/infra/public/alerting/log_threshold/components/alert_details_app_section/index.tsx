/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { LIGHT_THEME } from '@elastic/charts';
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
import {
  AlertAnnotation,
  getPaddedAlertTimeRange,
  AlertActiveTimeRangeAnnotation,
} from '@kbn/observability-alert-details';
import { useEuiTheme } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { get } from 'lodash';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { getChartGroupNames } from '../../../../../common/utils/get_chart_group_names';
import {
  ComparatorToi18nMap,
  ComparatorToi18nSymbolsMap,
  isRatioRule,
  type PartialCriterion,
} from '../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../expression_editor/criterion_preview_chart';
import { AlertDetailsAppSectionProps } from './types';
import { Threshold } from '../../../common/components/threshold';
import LogsRatioChart from './components/logs_ratio_chart';
import { ExplainLogRateSpikes } from './components/explain_log_rate_spikes';

const LogsHistoryChart = React.lazy(() => import('./components/logs_history_chart'));
const formatThreshold = (threshold: number) => String(threshold);

const AlertDetailsAppSection = ({
  rule,
  alert,
  setAlertSummaryFields,
}: AlertDetailsAppSectionProps) => {
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const { uiSettings } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();
  const theme = useTheme();
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;

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
            [field]: get(alert.fields[ALERT_CONTEXT], ['groupByKeys', ...field.split('.')], null),
          },
        }),
        {}
      ) || {};

    setSelectedSeries(getChartGroupNames(Object.values(alertFieldsFromGroupBy)));
    const alertSummaryFields = Object.entries(alertFieldsFromGroupBy).map(([label, value]) => ({
      label,
      value,
    }));
    setAlertSummaryFields(alertSummaryFields);
  }, [alert.fields, rule.params.groupBy, setAlertSummaryFields]);

  const getLogRatioChart = () => {
    if (isRatioRule(rule.params.criteria)) {
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
                chartProps={{ theme, baseTheme: LIGHT_THEME }}
                comparator={ComparatorToi18nSymbolsMap[rule.params.count.comparator]}
                id={'threshold-ratio-chart'}
                threshold={rule.params.count.value}
                value={Number(alert.fields[ALERT_EVALUATION_VALUE]?.toFixed(2))}
                valueFormatter={formatThreshold}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiSpacer size="s" />

              <LogsRatioChart
                buckets={1}
                logViewReference={{
                  type: 'log-view-reference',
                  logViewId: rule.params.logView.logViewId,
                }}
                ruleParams={rule.params}
                filterSeriesByGroupName={selectedSeries}
                showThreshold={true}
                threshold={rule.params.count}
                executionTimeRange={{
                  gte: Number(moment(timeRange.from).format('x')),
                  lte: Number(moment(timeRange.to).format('x')),
                }}
                annotations={[
                  <AlertAnnotation
                    key={`${alert.start}-start-alert-annotation`}
                    id={`${alert.start}-start-alert-annotation`}
                    alertStart={alert.start}
                    color={euiTheme.colors.danger}
                    dateFormat={uiSettings.get(UI_SETTINGS.DATE_FORMAT)}
                  />,
                  <AlertActiveTimeRangeAnnotation
                    key={`${alert.start}-active-alert-annotation`}
                    id={`${alert.start}-active-alert-annotation`}
                    alertStart={alert.start}
                    alertEnd={alertEnd}
                    color={euiTheme.colors.danger}
                  />,
                ]}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    } else return null;
  };

  const getLogCountChart = () => {
    if (!!rule.params.criteria && !isRatioRule(rule.params.criteria)) {
      return rule.params.criteria.map((criteria, idx) => {
        const chartCriterion = criteria as PartialCriterion;
        return (
          <EuiPanel
            key={`${chartCriterion.field}${idx}`}
            hasBorder={true}
            data-test-subj={`logsCountChartAlertDetails-${chartCriterion.field}${idx}`}
          >
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              {chartCriterion.comparator && (
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate('xpack.infra.logs.alertDetails.chart.chartTitle', {
                        defaultMessage: 'Logs for {field} {comparator} {value}',
                        values: {
                          field: chartCriterion.field,
                          comparator: ComparatorToi18nMap[chartCriterion.comparator],
                          value: chartCriterion.value,
                        },
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxHeight: 120 }} grow={1}>
                <EuiSpacer size="s" />
                {chartCriterion.comparator && (
                  <Threshold
                    title={`Threshold breached`}
                    chartProps={{ theme, baseTheme: LIGHT_THEME }}
                    comparator={ComparatorToi18nSymbolsMap[rule.params.count.comparator]}
                    id={`${chartCriterion.field}-${chartCriterion.value}`}
                    threshold={rule.params.count.value}
                    value={Number(alert.fields[ALERT_EVALUATION_VALUE])}
                    valueFormatter={formatThreshold}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={5}>
                <CriterionPreview
                  ruleParams={rule.params}
                  logViewReference={{
                    type: 'log-view-reference',
                    logViewId: rule.params.logView.logViewId,
                  }}
                  chartCriterion={chartCriterion}
                  showThreshold={true}
                  executionTimeRange={{
                    gte: Number(moment(timeRange.from).format('x')),
                    lte: Number(moment(timeRange.to).format('x')),
                  }}
                  annotations={[
                    <AlertAnnotation
                      key={`${alert.start}${chartCriterion.field}${idx}-start-alert-annotation`}
                      id={`${alert.start}${chartCriterion.field}${idx}-start-alert-annotation`}
                      alertStart={alert.start}
                      color={euiTheme.colors.danger}
                      dateFormat={uiSettings.get(UI_SETTINGS.DATE_FORMAT)}
                    />,
                    <AlertActiveTimeRangeAnnotation
                      key={`${alert.start}${chartCriterion.field}${idx}-active-alert-annotation`}
                      id={`${alert.start}${chartCriterion.field}${idx}-active-alert-annotation`}
                      alertStart={alert.start}
                      alertEnd={alertEnd}
                      color={euiTheme.colors.danger}
                    />,
                  ]}
                  filterSeriesByGroupName={[selectedSeries]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        );
      });
    } else return null;
  };

  const getLogsHistoryChart = () => {
    return (
      rule &&
      rule.params.criteria.length === 1 && (
        <EuiFlexItem>
          <LogsHistoryChart
            rule={{ ...rule, params: { ...rule.params, timeSize: 12, timeUnit: 'h' } }}
          />
        </EuiFlexItem>
      )
    );
  };

  const getExplainLogRateSpikesSection = () => {
    return <ExplainLogRateSpikes rule={rule} alert={alert} />;
  };

  return (
    <EuiFlexGroup direction="column" data-test-subj="logsThresholdAlertDetailsPage">
      {getLogRatioChart()}
      {getLogCountChart()}
      {getLogsHistoryChart()}
      {getExplainLogRateSpikesSection()}
    </EuiFlexGroup>
  );
};
// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
