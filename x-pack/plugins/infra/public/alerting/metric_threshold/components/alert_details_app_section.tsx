/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { Rule } from '@kbn/alerting-plugin/common';
import { useSourceContext, withSourceProvider } from '../../../containers/metrics_source';
import { MetricThresholdRuleTypeParams } from '..';
import { generateUniqueKey } from '../lib/generate_unique_key';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { ExpressionChart } from './expression_chart';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
interface AppSectionProps {
  rule: Rule<
    MetricThresholdRuleTypeParams & {
      filterQueryText?: string;
      groupBy?: string | string[];
    }
  >;
}

export function AlertDetailsAppSection({ rule }: AppSectionProps) {
  const { source, createDerivedIndexPattern } = useSourceContext();

  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );

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
            />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default withSourceProvider<AppSectionProps>(AlertDetailsAppSection)('default');
