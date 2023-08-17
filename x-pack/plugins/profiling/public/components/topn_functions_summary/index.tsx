/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { calculateImpactEstimates } from '../../../common/calculate_impact_estimates';
import { TopNFunctions } from '../../../common/functions';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { calculateBaseComparisonDiff } from '../topn_functions/utils';
import { SummaryItem } from './summary_item';

interface Props {
  baselineTopNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  isLoading: boolean;
  baselineDuration: number;
  comparisonDuration: number;
}

const ESTIMATED_VALUE_LABEL = i18n.translate('xpack.profiling.diffTopNFunctions.estimatedValue', {
  defaultMessage: 'Estimated value',
}) as string;

export function TopNFunctionsSummary({
  baselineTopNFunctions,
  comparisonTopNFunctions,
  baselineScaleFactor = 1,
  comparisonScaleFactor = 1,
  isLoading,
  baselineDuration,
  comparisonDuration,
}: Props) {
  const baselineScaledTotalSamples = baselineTopNFunctions
    ? baselineTopNFunctions.TotalCount * baselineScaleFactor
    : 0;

  const comparisonScaledTotalSamples = comparisonTopNFunctions
    ? comparisonTopNFunctions.TotalCount * comparisonScaleFactor
    : 0;

  const { co2EmissionDiff, costImpactDiff, totalSamplesDiff } = useMemo(() => {
    const baseImpactEstimates = baselineTopNFunctions
      ? // Do NOT scale values here. This is intended to show the exact values spent throughout the year
        calculateImpactEstimates({
          countExclusive: baselineTopNFunctions.selfCPU,
          countInclusive: baselineTopNFunctions.totalCPU,
          totalSamples: baselineTopNFunctions.TotalCount,
          totalSeconds: baselineDuration,
        })
      : undefined;

    const comparisonImpactEstimates = comparisonTopNFunctions
      ? // Do NOT scale values here. This is intended to show the exact values spent throughout the year
        calculateImpactEstimates({
          countExclusive: comparisonTopNFunctions.selfCPU,
          countInclusive: comparisonTopNFunctions.totalCPU,
          totalSamples: comparisonTopNFunctions.TotalCount,
          totalSeconds: comparisonDuration,
        })
      : undefined;

    return {
      totalSamplesDiff: calculateBaseComparisonDiff({
        baselineValue: baselineScaledTotalSamples || 0,
        comparisonValue: comparisonScaledTotalSamples || 0,
      }),
      co2EmissionDiff: calculateBaseComparisonDiff({
        baselineValue: baseImpactEstimates?.totalSamples?.annualizedCo2 || 0,
        comparisonValue: comparisonImpactEstimates?.totalSamples.annualizedCo2 || 0,
        formatValue: asWeight,
      }),
      costImpactDiff: calculateBaseComparisonDiff({
        baselineValue: baseImpactEstimates?.totalSamples.annualizedDollarCost || 0,
        comparisonValue: comparisonImpactEstimates?.totalSamples.annualizedDollarCost || 0,
        formatValue: asCost,
      }),
    };
  }, [
    baselineDuration,
    baselineScaledTotalSamples,
    baselineTopNFunctions,
    comparisonDuration,
    comparisonScaledTotalSamples,
    comparisonTopNFunctions,
  ]);

  const data = [
    {
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.performance', {
        defaultMessage: '{label} overall performance by',
        values: {
          label:
            isLoading ||
            totalSamplesDiff.percentDiffDelta === undefined ||
            totalSamplesDiff.label === undefined
              ? 'Gained/Lost'
              : totalSamplesDiff?.percentDiffDelta > 0
              ? 'Lost'
              : 'Gained',
        },
      }) as string,
      baseValue: totalSamplesDiff.label || '0%',
      baseIcon: totalSamplesDiff.icon,
      baseColor: totalSamplesDiff.color,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
    {
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.co2', {
        defaultMessage: 'Annualized CO2 emission impact',
      }) as string,
      baseValue: co2EmissionDiff.baseValue,
      comparisonValue: co2EmissionDiff.comparisonValue,
      comparisonIcon: co2EmissionDiff.icon,
      comparisonColor: co2EmissionDiff.color,
      comparisonPerc: co2EmissionDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
    {
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.cost', {
        defaultMessage: 'Annualized cost impact',
      }) as string,
      baseValue: costImpactDiff.baseValue,
      comparisonValue: costImpactDiff.comparisonValue,
      comparisonIcon: costImpactDiff.icon,
      comparisonColor: costImpactDiff.color,
      comparisonPerc: costImpactDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
    {
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.samples', {
        defaultMessage: 'Total number of samples',
      }) as string,
      baseValue: totalSamplesDiff.baseValue,
      comparisonValue: totalSamplesDiff.comparisonValue,
      comparisonIcon: totalSamplesDiff.icon,
      comparisonColor: totalSamplesDiff.color,
      comparisonPerc: totalSamplesDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
  ];

  return (
    <EuiFlexGroup direction="row">
      {data.map((item, idx) => {
        return (
          <EuiFlexItem key={idx}>
            <SummaryItem {...item} isLoading={isLoading} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
