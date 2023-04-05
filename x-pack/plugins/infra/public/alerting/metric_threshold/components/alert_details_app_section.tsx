/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { TopAlert } from '@kbn/observability-plugin/public';
import { ALERT_END, ALERT_START } from '@kbn/rule-data-utils';
import { Rule } from '@kbn/alerting-plugin/common';
import { AlertAnnotation, getAlertTimeRange } from '@kbn/observability-alert-details';
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
const ALERT_START_ANNOTATION_ID = 'annotation_alert_start';

interface AppSectionProps {
  rule: MetricThresholdRule;
  alert: MetricThresholdAlert;
}

export function AlertDetailsAppSection({ alert, rule }: AppSectionProps) {
  const { uiSettings } = useKibanaContextForPlugin().services;
  const { source, createDerivedIndexPattern } = useSourceContext();
  const { euiTheme } = useEuiTheme();

  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );
  const timeRange = getAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);
  const annotations = [
    <AlertAnnotation
      key={ALERT_START_ANNOTATION_ID}
      alertStart={alert.start}
      color={euiTheme.colors.danger}
      dateFormat={uiSettings.get('dateFormat') || DEFAULT_DATE_FORMAT}
      id={ALERT_START_ANNOTATION_ID}
    />,
  ];

  return !!rule.params.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="metricThresholdAppSection">
      {rule.params.criteria.map((criterion) => (
        <EuiFlexItem key={generateUniqueKey(criterion)}>
          <EuiPanel hasBorder hasShadow={false}>
            <ExpressionChart
              expression={criterion}
              derivedIndexPattern={derivedIndexPattern}
              source={source}
              filterQuery={rule.params.filterQueryText}
              groupBy={rule.params.groupBy}
              chartType={MetricsExplorerChartType.line}
              timeRange={timeRange}
              annotations={annotations}
            />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default withSourceProvider<AppSectionProps>(AlertDetailsAppSection)('default');
