/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Metric, MetricDatum } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
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

  const data: MetricDatum[] = useMemo(() => {
    return [
      {
        color: theme.euiTheme.colors.emptyShade,
        title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.performance', {
          defaultMessage: 'Gained/Lost overall performance by',
        }),
        icon: () => <EuiIcon type="visGauge" />,
        value: isLoading || !totalSamplesDiff.label ? '--' : totalSamplesDiff.label,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.co2', {
          defaultMessage: 'Annualized CO2 emission impact (estd.)',
        }),
        icon: () => <EuiIcon type="globe" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={co2EmissionDiff.comparisonValue}
            diff={co2EmissionDiff.label}
            color={co2EmissionDiff.color}
            icon={co2EmissionDiff.icon}
          />
        ),
        value: isLoading ? '--' : co2EmissionDiff.baseValue,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.cost', {
          defaultMessage: 'Annualized cost impact (estd.)',
        }),
        icon: () => <EuiIcon type="currency" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={costImpactDiff.comparisonValue}
            diff={costImpactDiff.label}
            color={costImpactDiff.color}
            icon={costImpactDiff.icon}
          />
        ),
        value: isLoading ? '--' : costImpactDiff.baseValue,
      },
      {
        color: theme.euiTheme.colors.emptyShade,
        title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.samples', {
          defaultMessage: 'Total number of samples (estd.)',
        }),
        icon: () => <EuiIcon type="documents" />,
        extra: isLoading ? undefined : (
          <ExtraValue
            value={totalSamplesDiff.comparisonValue}
            diff={totalSamplesDiff.label}
            color={totalSamplesDiff.color}
            icon={totalSamplesDiff.icon}
          />
        ),
        value: isLoading ? '--' : totalSamplesDiff.baseValue,
      },
    ];
  }, [
    co2EmissionDiff,
    isLoading,
    theme.euiTheme.colors.emptyShade,
    totalSamplesDiff,
    costImpactDiff,
  ]);

  return (
    <EuiFlexGroup direction="row" style={{ height: 120 }}>
      {data.map((item, idx) => {
        return (
          <EuiFlexItem key={item.title}>
            <Chart>
              <Metric id={idx.toString()} data={[[item]]} />
            </Chart>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
