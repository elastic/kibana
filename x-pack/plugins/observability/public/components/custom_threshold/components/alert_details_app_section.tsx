/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DataViewBase, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { ALERT_END, ALERT_START, ALERT_EVALUATION_VALUES } from '@kbn/rule-data-utils';
import { Rule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import {
  AlertAnnotation,
  getPaddedAlertTimeRange,
  AlertActiveTimeRangeAnnotation,
} from '@kbn/observability-alert-details';
import { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../utils/kibana_react';
import { metricValueFormatter } from '../../../../common/custom_threshold_rule/metric_value_formatter';
import { AlertSummaryField, TopAlert } from '../../..';
import { generateUniqueKey } from '../lib/generate_unique_key';

import { ExpressionChart } from './expression_chart';
import { TIME_LABELS } from './criterion_preview_chart/criterion_preview_chart';
import { Threshold } from './custom_threshold';
import { MetricsExplorerChartType } from '../hooks/use_metrics_explorer_options';
import { AlertParams, MetricExpression, MetricThresholdRuleTypeParams } from '../types';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type MetricThresholdRule = Rule<MetricThresholdRuleTypeParams>;
export type MetricThresholdAlert = TopAlert;

const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';
const ALERT_START_ANNOTATION_ID = 'alert_start_annotation';
const ALERT_TIME_RANGE_ANNOTATION_ID = 'alert_time_range_annotation';
const OVERVIEW_TAB_ID = 'overview';
const RELATED_EVENTS_TAB_ID = 'relatedEvents';

const cpuMetricPrefix = 'system.cpu';
const memoryMetricPrefix = 'system.memory';
const relatedMetrics = [
  'system.cpu.user.pct',
  'system.load.1',
  'system.memory.actual.used.pct',
  'system.filesystem.used.pct',
  'host.network.ingress.bytes',
  'host.network.egress.bytes',
];
const fnList = ['avg', 'sum', 'min', 'max'];

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
  const [, setDataViewError] = useState<Error>();
  const ruleParams = rule.params as RuleTypeParams & AlertParams;
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
          'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.rule',
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

  const derivedIndexPattern = useMemo<DataViewBase>(
    () => ({
      fields: dataView?.fields || [],
      title: dataView?.getIndexPattern() || 'unknown-index',
    }),
    [dataView]
  );

  useEffect(() => {
    const initDataView = async () => {
      const ruleSearchConfiguration = ruleParams.searchConfiguration;
      try {
        const createdSearchSource = await data.search.searchSource.create(ruleSearchConfiguration);
        setDataView(createdSearchSource.getField('index'));
      } catch (error) {
        setDataViewError(error);
      }
    };

    initDataView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource]);

  const overviewTab = !!ruleParams.criteria ? (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" data-test-subj="thresholdAlertOverviewSection">
        {ruleParams.criteria.map((criterion, index) => (
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
                  id="xpack.observability.customThreshold.rule.alertDetailsAppSection.criterion.subtitle"
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
                      'xpack.observability.customThreshold.rule.alertDetailsAppSection.thresholdTitle',
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
                    filterQuery={(ruleParams.searchConfiguration?.query as Query)?.query as string}
                    groupBy={ruleParams.groupBy}
                    hideTitle
                    timeRange={timeRange}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  ) : null;

  const isCpuOrMemoryCriterion = (criterion: MetricExpression) =>
    criterion.metrics?.some(
      (metric: CustomThresholdExpressionMetric) =>
        metric.field?.includes(cpuMetricPrefix) || metric.field?.includes(memoryMetricPrefix)
    );

  const relatedMetricsPerCriteria = () => {
    const hasCpuOrMemoryCriteria = ruleParams.criteria.some((criterion) =>
      isCpuOrMemoryCriterion(criterion)
    );

    const relatedMetricsInDataView = hasCpuOrMemoryCriteria
      ? dataView?.fields
          .map((field) => field.name)
          .filter((fieldName) => relatedMetrics.includes(fieldName))
      : [];

    const aggType = ruleParams.criteria
      .find((criterion) => isCpuOrMemoryCriterion(criterion))
      ?.metrics?.find(
        (metric) =>
          metric.field?.includes(cpuMetricPrefix) || metric.field?.includes(memoryMetricPrefix)
      )?.aggType;

    const metricAggType = fnList.includes(aggType || '') ? aggType : 'avg';

    return { relatedMetricsInDataView, metricAggType };
  };

  const relatedEventsTimeRangeEnd = moment(alert.start).add(
    (ruleParams.criteria[0].timeSize ?? 5) * 2,
    ruleParams.criteria[0].timeUnit ?? 'minutes'
  );

  const relatedEventsTimeRange = (): TimeRange => {
    return {
      from: moment(alert.start)
        .subtract(
          (ruleParams.criteria[0].timeSize ?? 5) * 2,
          ruleParams.criteria[0].timeUnit ?? 'minutes'
        )
        .toISOString(),
      to:
        relatedEventsTimeRangeEnd.valueOf() > moment.now()
          ? moment().toISOString()
          : relatedEventsTimeRangeEnd.toISOString(),
      mode: 'absolute',
    };
  };

  const { relatedMetricsInDataView, metricAggType } = relatedMetricsPerCriteria();

  const relatedEventsTab = !!ruleParams.criteria ? (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" data-test-subj="thresholdAlertRelatedEventsSection">
        {relatedMetricsInDataView?.map(
          (relatedMetric, relatedMetricIndex) =>
            dataView &&
            dataView.id && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {metricAggType}({relatedMetric})
                  </h4>
                </EuiTitle>
                <EuiHorizontalRule margin="xs" />
                <EmbeddableChangePointChart
                  id={`relatedMetric${relatedMetricIndex}`}
                  key={`relatedMetric${relatedMetricIndex}`}
                  dataViewId={dataView.id}
                  timeRange={relatedEventsTimeRange()}
                  fn={metricAggType || 'avg'}
                  metricField={relatedMetric}
                />
              </EuiFlexItem>
            )
        )}
      </EuiFlexGroup>
    </>
  ) : null;

  const tabs: EuiTabbedContentTab[] = [
    {
      id: OVERVIEW_TAB_ID,
      name: i18n.translate('xpack.observability.threshold.alertDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      content: overviewTab,
    },
    {
      id: RELATED_EVENTS_TAB_ID,
      name: i18n.translate('xpack.observability.threshold.alertDetails.tab.relatedEventsLabel', {
        defaultMessage: 'Related Events',
      }),
      'data-test-subj': 'relatedEventsTab',
      content: relatedEventsTab,
    },
  ];

  return <EuiTabbedContent data-test-subj="thresholdAlertDetailsTabbedContent" tabs={tabs} />;
}
