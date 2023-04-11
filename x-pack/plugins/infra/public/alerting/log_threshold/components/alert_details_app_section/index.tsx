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
import { ALERT_DURATION, ALERT_END, ALERT_EVALUATION_VALUE } from '@kbn/rule-data-utils';
import moment from 'moment';
import { useTheme } from '@emotion/react';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { getChartGroupNames } from '../../../../../common/utils/get_chart_group_names';
import {
  ComparatorToi18nSymbolsMap,
  type PartialCriterion,
} from '../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../expression_editor/criterion_preview_chart';
import { AlertAnnotation } from './components/alert_annotation';
import { AlertDetailsAppSectionProps } from './types';
import { Threshold } from '../../../common/components/threshold';

const LogsHistoryChart = React.lazy(() => import('./components/logs_history_chart'));

const LOG_FOR = i18n.translate('xpack.infra.logs.alertDetails.chart.chartTitle', {
  defaultMessage: 'Logs for ',
});
const LAST = i18n.translate('xpack.infra.logs.alertDetails.chart.last', {
  defaultMessage: 'Last ',
});
const AlertDetailsAppSection = ({
  rule,
  alert,
  setAlertSummaryFields,
}: AlertDetailsAppSectionProps) => {
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const theme = useTheme();
  /* For now we show the history chart only if we have one criteria */
  const [showHistoryChart, setShowHistoryChart] = useState<boolean>(false);
  const ruleWindowSizeMS = moment
    .duration(rule.params.timeSize, rule.params.timeUnit)
    .asMilliseconds();
  const alertDurationMS = alert.fields[ALERT_DURATION]! / 1000;
  const TWENTY_TIMES_RULE_WINDOW_MS = 20 * ruleWindowSizeMS;

  /**
   * The `CriterionPreview` chart shows all the series/data stacked when there is a GroupBy in the rule parameters.
   * e.g., `host.name`, the chart will show stacks of data by hostname.
   * We only need the chart to show the series that is related to the selected alert.
   * The chart series are built based on the GroupBy in the rule params
   * Each series have an id which is the just a joining of fields value of the GroupBy `getChartGroupNames`
   * We filter down the series using this group name
   */
  useEffect(() => {
    setShowHistoryChart(rule && rule.params.criteria.length === 1);
  }, [rule, rule.params.criteria]);

  useEffect(() => {
    const alertFieldsFromGroupBy =
      rule.params.groupBy?.reduce(
        (selectedFields: Record<string, any>, field) => ({
          ...selectedFields,
          ...{ [field]: alert.fields[field] },
        }),
        {}
      ) || {};

    setSelectedSeries(getChartGroupNames(Object.values(alertFieldsFromGroupBy)));
    const test = Object.keys(alertFieldsFromGroupBy).map((key) => ({
      label: key,
      value: alertFieldsFromGroupBy[key],
    }));

    setAlertSummaryFields(test);
  }, [alert.fields, rule.params.groupBy, setAlertSummaryFields]);
  const formatValue = (threshold: number) => String(threshold);
  /**
   * This is part or the requirements (RFC).
   * If the alert is less than 20 units of `FOR THE LAST <x> <units>` then we should draw a time range of 20 units.
   * IE. The user set "FOR THE LAST 5 minutes" at a minimum we should show 100 minutes.
   */
  const rangeFrom =
    alertDurationMS < TWENTY_TIMES_RULE_WINDOW_MS
      ? Number(moment(alert.start).subtract(TWENTY_TIMES_RULE_WINDOW_MS, 'millisecond').format('x'))
      : Number(moment(alert.start).subtract(ruleWindowSizeMS, 'millisecond').format('x'));

  const rangeTo = alert.active
    ? Date.now()
    : Number(moment(alert.fields[ALERT_END]).add(ruleWindowSizeMS, 'millisecond').format('x'));

  return (
    // Create a chart per-criteria
    !!rule.params.criteria ? (
      <EuiFlexGroup direction="column" data-test-subj="logsThresholdAlertDetailsPage">
        {rule.params.criteria.map((criteria, idx) => {
          const chartCriterion = criteria as PartialCriterion;
          return (
            <EuiPanel hasBorder={true} data-test-subj="logsHistoryChartAlertDetails">
              <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h2>
                      {LOG_FOR} {chartCriterion.field} {chartCriterion.comparator}{' '}
                      {chartCriterion.value}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {LAST} {moment(rangeFrom).locale(i18n.getLocale()).fromNow(true)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiFlexGroup key={`${chartCriterion.field}${idx}`}>
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
                      valueFormatter={formatValue}
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
                    executionTimeRange={{ gte: rangeFrom, lte: rangeTo }}
                    annotations={[
                      <AlertAnnotation
                        key={`${alert.start}${chartCriterion.field}${idx}`}
                        alertStarted={alert.start}
                      />,
                    ]}
                    filterSeriesByGroupName={[selectedSeries]}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          );
        })}
        {showHistoryChart && (
          <EuiFlexItem>
            <LogsHistoryChart rule={rule} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ) : null
  );
};
// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
