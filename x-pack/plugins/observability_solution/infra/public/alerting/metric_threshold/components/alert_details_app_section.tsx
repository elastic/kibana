/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { convertToBuiltInComparators } from '@kbn/observability-plugin/common';
import React, { useEffect } from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { AlertSummaryField, TopAlert } from '@kbn/observability-plugin/public';
import {
  ALERT_END,
  ALERT_START,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  TAGS,
} from '@kbn/rule-data-utils';
import { Rule } from '@kbn/alerting-plugin/common';
import { AlertAnnotation, AlertActiveTimeRangeAnnotation } from '@kbn/observability-alert-details';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { metricValueFormatter } from '../../../../common/alerting/metrics/metric_value_formatter';
import { Threshold } from '../../common/components/threshold';
import { withSourceProvider } from '../../../containers/metrics_source';
import { generateUniqueKey } from '../lib/generate_unique_key';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { MetricThresholdRuleTypeParams } from '..';
import { ExpressionChart } from './expression_chart';
import { Groups } from './groups';
import { Tags } from './tags';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type MetricThresholdRule = Rule<
  MetricThresholdRuleTypeParams & {
    filterQueryText?: string;
    groupBy?: string | string[];
  }
>;

interface Group {
  field: string;
  value: string;
}

interface MetricThresholdAlertField {
  [ALERT_EVALUATION_VALUES]?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
}

export type MetricThresholdAlert = TopAlert<MetricThresholdAlertField>;

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
  const { euiTheme } = useEuiTheme();
  const groupInstance = alert.fields[ALERT_GROUP]?.map((group: Group) => group.value);
  const groups = alert.fields[ALERT_GROUP];
  const tags = alert.fields[TAGS];

  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
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
    const alertSummaryFields = [];
    if (groups) {
      alertSummaryFields.push({
        label: i18n.translate('xpack.infra.metrics.alertDetailsAppSection.summaryField.source', {
          defaultMessage: 'Source',
        }),
        value: <Groups groups={groups} />,
      });
    }
    if (tags && tags.length > 0) {
      alertSummaryFields.push({
        label: i18n.translate('xpack.infra.metrics.alertDetailsAppSection.summaryField.tags', {
          defaultMessage: 'Tags',
        }),
        value: <Tags tags={tags} />,
      });
    }
    alertSummaryFields.push({
      label: i18n.translate('xpack.infra.metrics.alertDetailsAppSection.summaryField.rule', {
        defaultMessage: 'Rule',
      }),
      value: (
        <EuiLink data-test-subj="metricsRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
          {rule.name}
        </EuiLink>
      ),
    });

    setAlertSummaryFields(alertSummaryFields);
  }, [groups, tags, rule, ruleLink, setAlertSummaryFields]);

  return !!rule.params.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="metricThresholdAppSection">
      {rule.params.criteria.map((criterion, index) => {
        const timeRange = getPaddedAlertTimeRange(
          alert.fields[ALERT_START]!,
          alert.fields[ALERT_END],
          {
            size: criterion.timeSize,
            unit: criterion.timeUnit,
          }
        );
        return (
          <EuiFlexItem key={generateUniqueKey(criterion)}>
            <EuiPanel hasBorder hasShadow={false}>
              <EuiTitle size="xs">
                <h4>
                  {criterion.aggType.toUpperCase()}{' '}
                  {'metric' in criterion ? criterion.metric : undefined}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem style={{ minHeight: 150, minWidth: 160 }} grow={1}>
                  <Threshold
                    chartProps={chartProps}
                    id={`threshold-${generateUniqueKey(criterion)}`}
                    thresholds={criterion.threshold}
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
                    comparator={convertToBuiltInComparators(criterion.comparator)}
                    warning={
                      criterion.warningThreshold &&
                      criterion.warningComparator && {
                        thresholds: criterion.warningThreshold,
                        comparator: convertToBuiltInComparators(criterion.warningComparator),
                      }
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={5}>
                  <ExpressionChart
                    annotations={annotations}
                    chartType={MetricsExplorerChartType.line}
                    expression={criterion}
                    filterQuery={rule.params.filterQueryText}
                    groupBy={rule.params.groupBy}
                    groupInstance={groupInstance}
                    hideTitle
                    timeRange={timeRange}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default withSourceProvider<AppSectionProps>(AlertDetailsAppSection)('default');
