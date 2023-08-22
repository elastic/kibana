/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { TopNFunctions } from '../../../common/functions';
import { StackFrameMetadata } from '../../../common/profiling';
import { calculateImpactEstimates } from '../../../common/calculate_impact_estimates';

export function getColorLabel(percent: number) {
  if (percent === 0) {
    return { color: 'text', label: `0%`, icon: undefined };
  }

  const color = percent < 0 ? 'success' : 'danger';
  const icon = percent < 0 ? 'sortUp' : 'sortDown';
  const isSmallPercent = Math.abs(percent) <= 0.01;
  const value = isSmallPercent ? '<0.01' : Math.abs(percent).toFixed(2);

  if (isFinite(percent)) {
    return { color, label: `${value}%`, icon };
  }

  return { color: 'text', label: undefined, icon: undefined };
}

export function scaleValue({ value, scaleFactor = 1 }: { value: number; scaleFactor?: number }) {
  return value * scaleFactor;
}

export interface IFunctionRow {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  selfCPU: number;
  totalCPU: number;
  selfCPUPerc: number;
  totalCPUPerc: number;
  impactEstimates?: ReturnType<typeof calculateImpactEstimates>;
  diff?: {
    rank: number;
    samples: number;
    selfCPU: number;
    totalCPU: number;
    selfCPUPerc: number;
    totalCPUPerc: number;
    impactEstimates?: ReturnType<typeof calculateImpactEstimates>;
  };
}

export function getFunctionsRows({
  baselineScaleFactor,
  comparisonScaleFactor,
  comparisonTopNFunctions,
  topNFunctions,
  totalSeconds,
}: {
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  comparisonTopNFunctions?: TopNFunctions;
  topNFunctions?: TopNFunctions;
  totalSeconds: number;
}): IFunctionRow[] {
  if (!topNFunctions || !topNFunctions.TotalCount || topNFunctions.TotalCount === 0) {
    return [];
  }

  const comparisonDataById = comparisonTopNFunctions
    ? keyBy(comparisonTopNFunctions.TopN, 'Id')
    : {};

  return topNFunctions.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => {
    const comparisonRow = comparisonDataById?.[topN.Id];

    const scaledSelfCPU = scaleValue({
      value: topN.CountExclusive,
      scaleFactor: baselineScaleFactor,
    });

    const totalCPUPerc = (topN.CountInclusive / topNFunctions.TotalCount) * 100;
    const selfCPUPerc = (topN.CountExclusive / topNFunctions.TotalCount) * 100;

    const impactEstimates =
      totalSeconds > 0
        ? calculateImpactEstimates({
            countExclusive: topN.CountExclusive,
            countInclusive: topN.CountInclusive,
            totalSamples: topNFunctions.TotalCount,
            totalSeconds,
          })
        : undefined;

    function calculateDiff() {
      if (comparisonTopNFunctions && comparisonRow) {
        const comparisonScaledSelfCPU = scaleValue({
          value: comparisonRow.CountExclusive,
          scaleFactor: comparisonScaleFactor,
        });

        const scaledDiffSamples = scaledSelfCPU - comparisonScaledSelfCPU;

        return {
          rank: topN.Rank - comparisonRow.Rank,
          samples: scaledDiffSamples,
          selfCPU: comparisonRow.CountExclusive,
          totalCPU: comparisonRow.CountInclusive,
          selfCPUPerc:
            selfCPUPerc - (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
          totalCPUPerc:
            totalCPUPerc -
            (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
        };
      }
    }

    return {
      rank: topN.Rank,
      frame: topN.Frame,
      samples: scaledSelfCPU,
      selfCPUPerc,
      totalCPUPerc,
      selfCPU: topN.CountExclusive,
      totalCPU: topN.CountInclusive,
      impactEstimates,
      diff: calculateDiff(),
    };
  });
}

export function calculateBaseComparisonDiff({
  baselineValue,
  baselineScaleFactor,
  comparisonValue,
  comparisonScaleFactor,
  formatValue,
}: {
  baselineValue: number;
  baselineScaleFactor?: number;
  comparisonValue: number;
  comparisonScaleFactor?: number;
  formatValue?: (value: number) => string;
}) {
  const scaledBaselineValue = scaleValue({
    value: baselineValue,
    scaleFactor: baselineScaleFactor,
  });

  const baseValue = formatValue
    ? formatValue(scaledBaselineValue)
    : scaledBaselineValue.toLocaleString();
  if (comparisonValue === 0) {
    return { baseValue };
  }

  const scaledComparisonValue = scaleValue({
    value: comparisonValue,
    scaleFactor: comparisonScaleFactor,
  });

  const diffSamples = scaledComparisonValue - scaledBaselineValue;
  const percentDiffDelta = (diffSamples / (scaledComparisonValue - diffSamples)) * 100;
  const { color, icon, label } = getColorLabel(percentDiffDelta);
  return {
    baseValue,
    comparisonValue: formatValue
      ? formatValue(scaledComparisonValue)
      : scaledComparisonValue.toLocaleString(),
    percentDiffDelta,
    color,
    icon,
    label,
  };
}
