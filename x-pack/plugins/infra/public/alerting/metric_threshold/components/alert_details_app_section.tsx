/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo } from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { AlertSummaryField, TopAlert } from '@kbn/observability-plugin/public';
import { ALERT_END, ALERT_START, ALERT_EVALUATION_VALUES } from '@kbn/rule-data-utils';
import { Rule } from '@kbn/alerting-plugin/common';
import {
  AlertAnnotation,
  getPaddedAlertTimeRange,
  AlertActiveTimeRangeAnnotation,
} from '@kbn/observability-alert-details';
import { metricValueFormatter } from '../../../../common/alerting/metrics/metric_value_formatter';
import { TIME_LABELS } from '../../common/criterion_preview_chart/criterion_preview_chart';
import { Threshold } from '../../common/components/threshold';
import { useSourceContext, withSourceProvider } from '../../../containers/metrics_source';
import { generateUniqueKey } from '../lib/generate_unique_key';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { MetricThresholdRuleTypeParams } from '..';
import { ExpressionChart } from './expression_chart';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type MetricThresholdRule = Rule<
  MetricThresholdRuleTypeParams & {
    filterQueryText?: string;
    groupBy?: string | string[];
  }
>;
export type MetricThresholdAlert = TopAlert;

const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';
const ALERT_START_ANNOTATION_ID = 'alert_start_annotation';
const ALERT_TIME_RANGE_ANNOTATION_ID = 'alert_time_range_annotation';

interface AppSectionProps {
  alert: MetricThresholdAlert;
  rule: MetricThresholdRule;
  ruleLink: string;
  setAlertSummaryFields: React.Dispatch<React.SetStateAction<AlertSummaryField[] | undefined>>;
}

export function AlertDetailsAppSection({
  alert,
  rule,
  ruleLink,
  setAlertSummaryFields,
}: AppSectionProps) {
  const { uiSettings, charts } = useKibanaContextForPlugin().services;
  const { source, createDerivedIndexPattern } = useSourceContext();
  const { euiTheme } = useEuiTheme();

  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );
  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const alertEnd = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]).valueOf() : undefined;
  const annotations = [
    <AlertAnnotation
      alertStart={alert.start}
      color={euiTheme.colors.danger}
      dateFormat={uiSettings.get('dateFormat') || DEFAULT_DATE_FORMAT}
      id={ALERT_START_ANNOTATION_ID}
      key={ALERT_START_ANNOTATION_ID}
    />,
    <AlertActiveTimeRangeAnnotation
      alertStart={alert.start}
      alertEnd={alertEnd}
      color={euiTheme.colors.danger}
      id={ALERT_TIME_RANGE_ANNOTATION_ID}
      key={ALERT_TIME_RANGE_ANNOTATION_ID}
    />,
  ];
  useEffect(() => {
    setAlertSummaryFields([
      {
        label: i18n.translate('xpack.infra.metrics.alertDetailsAppSection.summaryField.rule', {
          defaultMessage: 'Rule',
        }),
        value: (
          <EuiLink data-test-subj="alertDetailsAppSectionRuleLink" href={ruleLink}>
            {rule.name}
          </EuiLink>
        ),
      },
    ]);
  }, [alert, rule, ruleLink, setAlertSummaryFields]);

  return !!rule.params.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="metricThresholdAppSection">
      {rule.params.criteria.map((criterion, index) => (
        <EuiFlexItem key={generateUniqueKey(criterion)}>
          <EuiPanel hasBorder hasShadow={false}>
            <EuiTitle size="xs">
              <h4>
                {criterion.aggType.toUpperCase()}{' '}
                {'metric' in criterion ? criterion.metric : undefined}
              </h4>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.infra.metrics.alertDetailsAppSection.criterion.subtitle"
                defaultMessage="Last {lookback} {timeLabel}"
                values={{
                  lookback: criterion.timeSize,
                  timeLabel: TIME_LABELS[criterion.timeUnit as keyof typeof TIME_LABELS],
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ minHeight: 150, minWidth: 160 }} grow={1}>
                <Threshold
                  chartProps={chartProps}
                  id={`threshold-${generateUniqueKey(criterion)}`}
                  threshold={criterion.threshold[0]}
                  value={alert.fields[ALERT_EVALUATION_VALUES]![index]}
                  valueFormatter={(d) =>
                    metricValueFormatter(d, 'metric' in criterion ? criterion.metric : undefined)
                  }
                  title={i18n.translate(
                    'xpack.infra.metrics.alertDetailsAppSection.thresholdTitle',
                    {
                      defaultMessage: 'Threshold breached',
                    }
                  )}
                  comparator={criterion.comparator}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={5}>
                <ExpressionChart
                  annotations={annotations}
                  chartType={MetricsExplorerChartType.line}
                  derivedIndexPattern={derivedIndexPattern}
                  expression={criterion}
                  filterQuery={rule.params.filterQueryText}
                  groupBy={rule.params.groupBy}
                  hideTitle
                  source={source}
                  timeRange={timeRange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default withSourceProvider<AppSectionProps>(AlertDetailsAppSection)('default');
