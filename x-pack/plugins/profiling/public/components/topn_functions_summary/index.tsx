/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Metric, MetricDatum } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { TopNFunctions } from '../../../common/functions';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { calculateBaseComparisonDiff } from '../topn_functions/utils';
import { ExtraValue } from './extra_value';

interface Props {
  baselineTopNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  isLoading: boolean;
}

export function TopNFunctionsSummary({
  baselineTopNFunctions,
  comparisonTopNFunctions,
  baselineScaleFactor,
  comparisonScaleFactor,
  isLoading,
}: Props) {
  const theme = useEuiTheme();

  const totalSamplesDiff = calculateBaseComparisonDiff({
    baselineValue: baselineTopNFunctions?.TotalCount || 0,
    baselineScaleFactor,
    comparisonValue: comparisonTopNFunctions?.TotalCount || 0,
    comparisonScaleFactor,
  });

  const co2EmissionDiff = calculateBaseComparisonDiff({
    baselineValue: baselineTopNFunctions?.impactEstimates?.annualizedCo2 || 0,
    baselineScaleFactor,
    comparisonValue: comparisonTopNFunctions?.impactEstimates?.annualizedCo2 || 0,
    comparisonScaleFactor,
    formatValue: asWeight,
  });

  const costImpactDiff = calculateBaseComparisonDiff({
    baselineValue: baselineTopNFunctions?.impactEstimates?.annualizedDollarCost || 0,
    baselineScaleFactor,
    comparisonValue: comparisonTopNFunctions?.impactEstimates?.annualizedDollarCost || 0,
    comparisonScaleFactor,
    formatValue: asCost,
  });

  // TODO: I don't think I must use selfCPUPerc here
  const performanceDiff = calculateBaseComparisonDiff({
    baselineValue: baselineTopNFunctions?.selfCPUPerc || 0,
    baselineScaleFactor,
    comparisonValue: comparisonTopNFunctions?.selfCPUPerc || 0,
    comparisonScaleFactor,
  });

  const data: MetricDatum[] = useMemo(() => {
    return [
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Total number of samples (estd.)',
        icon: () => <EuiIcon type="documents" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={totalSamplesDiff.comparisonValue}
            diff={totalSamplesDiff.label}
            color={totalSamplesDiff.color}
            icon={totalSamplesDiff.icon}
          />
        ),
        value: isLoading ? 'N/A' : totalSamplesDiff.baseValue,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Gained/Lost overaal performance by',
        icon: () => <EuiIcon type="visGauge" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={performanceDiff.comparisonValue}
            diff={performanceDiff.label}
            color={performanceDiff.color}
            icon={performanceDiff.icon}
          />
        ),
        value: isLoading ? 'N/A' : performanceDiff.baseValue,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Estimated CO2 emission impact',
        icon: () => <EuiIcon type="globe" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={co2EmissionDiff.comparisonValue}
            diff={co2EmissionDiff.label}
            color={co2EmissionDiff.color}
            icon={co2EmissionDiff.icon}
          />
        ),
        value: isLoading ? 'N/A' : co2EmissionDiff.baseValue,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: 'Estimated cost impact',
        icon: () => <EuiIcon type="currency" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={costImpactDiff.comparisonValue}
            diff={costImpactDiff.label}
            color={costImpactDiff.color}
            icon={costImpactDiff.icon}
          />
        ),
        value: isLoading ? 'N/A' : costImpactDiff.baseValue,
      },
    ];
  }, [
    co2EmissionDiff,
    isLoading,
    theme.euiTheme.colors.emptyShade,
    totalSamplesDiff,
    costImpactDiff,
    performanceDiff,
  ]);

  return (
    <EuiFlexGroup direction="row" style={{ height: 120 }}>
      {data.map((item) => {
        return (
          <EuiFlexItem key={item.title}>
            <Chart>
              <Metric id="metricId" data={[[item]]} />
            </Chart>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
