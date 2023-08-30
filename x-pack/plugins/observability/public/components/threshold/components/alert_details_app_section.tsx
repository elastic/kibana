/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
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
import { ALERT_END, ALERT_START, ALERT_EVALUATION_VALUES } from '@kbn/rule-data-utils';
import { Rule } from '@kbn/alerting-plugin/common';
import {
  AlertAnnotation,
  getPaddedAlertTimeRange,
  AlertActiveTimeRangeAnnotation,
} from '@kbn/observability-alert-details';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../utils/kibana_react';
import { metricValueFormatter } from '../../../../common/threshold_rule/metric_value_formatter';
import { AlertSummaryField, TopAlert } from '../../..';
import { generateUniqueKey } from '../lib/generate_unique_key';

import { ExpressionChart } from './expression_chart';
import { TIME_LABELS } from './criterion_preview_chart/criterion_preview_chart';
import { Threshold } from './threshold';
import { MetricsExplorerChartType } from '../hooks/use_metrics_explorer_options';
import { MetricThresholdRuleTypeParams } from '../types';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type MetricThresholdRule = Rule<
  MetricThresholdRuleTypeParams & {
    filterQuery?: string;
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

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsAppSection({
  alert,
  rule,
  ruleLink,
  setAlertSummaryFields,
}: AppSectionProps) {
  const { uiSettings, charts, aiops, data } = useKibana().services;
  const { EmbeddableChangePointChart } = aiops;

  const { euiTheme } = useEuiTheme();

  const [dataView, setDataView] = useState<DataView>();

  // TODO Use rule data view
  const derivedIndexPattern = useMemo<DataViewBase>(
    () => ({
      fields: [],
      title: 'unknown-index',
    }),
    []
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
        label: i18n.translate(
          'xpack.observability.threshold.rule.alertDetailsAppSection.summaryField.rule',
          {
            defaultMessage: 'Rule',
          }
        ),
        value: (
          <EuiLink data-test-subj="thresholdRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
            {rule.name}
          </EuiLink>
        ),
      },
    ]);
  }, [alert, rule, ruleLink, setAlertSummaryFields]);

  useEffect(() => {
    const initDataView = async () => {
      const defaultDataView = await data.dataViews.getDefaultDataView();
      if (defaultDataView) {
        setDataView(defaultDataView);
      }
    };

    initDataView();
  }, [data.dataViews]);

  return !!rule.params.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="thresholdRuleAppSection">
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
                id="xpack.observability.threshold.rule.alertDetailsAppSection.criterion.subtitle"
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
                    'xpack.observability.threshold.rule.alertDetailsAppSection.thresholdTitle',
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
                  filterQuery={rule.params.filterQuery}
                  groupBy={rule.params.groupBy}
                  hideTitle
                  timeRange={timeRange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
      <EmbeddableChangePointChart
        dataViewId={dataView?.id ?? ''}
        timeRange={{
          from: moment(alert.start).subtract(15, 'minutes').toISOString(),
          to: moment(alert.lastUpdated).toISOString(),
          mode: 'absolute',
        }}
        fn="avg"
        metricField="system.cpu.idle.norm.pct"
      />
    </EuiFlexGroup>
  ) : null;
}
