/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { profilingUseLegacyCo2Calculation } from '@kbn/observability-plugin/common';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { calculateBaseComparisonDiff } from '../topn_functions/utils';
import { SummaryItem } from './summary_item';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface FrameValue {
  selfCPU: number;
  totalCPU: number;
  totalCount: number;
  duration: number;
  scaleFactor?: number;
  totalAnnualCO2Kgs: number;
  totalAnnualCostUSD: number;
}

interface Props {
  baseValue?: FrameValue;
  comparisonValue?: FrameValue;
  isLoading: boolean;
}

const ESTIMATED_VALUE_LABEL = i18n.translate('xpack.profiling.diffTopNFunctions.estimatedValue', {
  defaultMessage: 'Estimated value',
}) as string;

function getScaleFactor(scaleFactor: number = 1) {
  return scaleFactor;
}

export function FramesSummary({ baseValue, comparisonValue, isLoading }: Props) {
  const {
    start: { core },
  } = useProfilingDependencies();
  const shouldUseLegacyCo2Calculation = core.uiSettings.get<boolean>(
    profilingUseLegacyCo2Calculation
  );
  const calculateImpactEstimates = useCalculateImpactEstimate();

  const baselineScaledTotalSamples = baseValue
    ? baseValue.totalCount * getScaleFactor(baseValue.scaleFactor)
    : 0;

  const comparisonScaledTotalSamples = comparisonValue
    ? comparisonValue.totalCount * getScaleFactor(comparisonValue.scaleFactor)
    : 0;

  const { co2EmissionDiff, costImpactDiff, totalSamplesDiff } = useMemo(() => {
    const baseImpactEstimates = baseValue
      ? // Do NOT scale values here. This is intended to show the exact values spent throughout the year
        calculateImpactEstimates({
          countExclusive: baseValue.selfCPU,
          countInclusive: baseValue.totalCPU,
          totalSamples: baseValue.totalCount,
          totalSeconds: baseValue.duration,
        })
      : undefined;

    const comparisonImpactEstimates = comparisonValue
      ? // Do NOT scale values here. This is intended to show the exact values spent throughout the year
        calculateImpactEstimates({
          countExclusive: comparisonValue.selfCPU,
          countInclusive: comparisonValue.totalCPU,
          totalSamples: comparisonValue.totalCount,
          totalSeconds: comparisonValue.duration,
        })
      : undefined;

    return {
      totalSamplesDiff: calculateBaseComparisonDiff({
        baselineValue: baselineScaledTotalSamples || 0,
        comparisonValue: comparisonScaledTotalSamples || 0,
      }),
      co2EmissionDiff: calculateBaseComparisonDiff({
        baselineValue:
          (shouldUseLegacyCo2Calculation
            ? baseImpactEstimates?.totalSamples?.annualizedCo2
            : baseValue?.totalAnnualCO2Kgs) || 0,
        comparisonValue:
          (shouldUseLegacyCo2Calculation
            ? comparisonImpactEstimates?.totalSamples.annualizedCo2
            : comparisonValue?.totalAnnualCO2Kgs) || 0,
        formatValue: (value) => asWeight(value, 'kgs'),
      }),
      costImpactDiff: calculateBaseComparisonDiff({
        baselineValue:
          (shouldUseLegacyCo2Calculation
            ? baseImpactEstimates?.totalSamples.annualizedDollarCost
            : baseValue?.totalAnnualCostUSD) || 0,
        comparisonValue:
          (shouldUseLegacyCo2Calculation
            ? comparisonImpactEstimates?.totalSamples.annualizedDollarCost
            : comparisonValue?.totalAnnualCostUSD) || 0,
        formatValue: asCost,
      }),
    };
  }, [
    baseValue,
    baselineScaledTotalSamples,
    calculateImpactEstimates,
    comparisonScaledTotalSamples,
    comparisonValue,
    shouldUseLegacyCo2Calculation,
  ]);

  const data = [
    {
      id: 'overallPerformance',
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
      id: 'annualizedCo2',
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
      id: 'annualizedCost',
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
      id: 'totalNumberOfSamples',
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
    <EuiAccordion
      initialIsOpen
      id="TopNFunctionsSummary"
      buttonContent={
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText color={data[0].baseColor} style={{ fontWeight: 'bold' }} textAlign="left">
              {data[0].title}
            </EuiText>
          </EuiFlexItem>
          {data[0].baseIcon && (
            <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
              <EuiIcon type={data[0].baseIcon} color={data[0].baseColor} size="s" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTextColor style={{ fontWeight: 'bold' }} color={data[0].baseColor}>
              {data[0].baseValue}
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="row">
          {data.map((item, idx) => {
            return (
              <EuiFlexItem key={idx}>
                <SummaryItem {...item} isLoading={isLoading} />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </>
    </EuiAccordion>
  );
}
