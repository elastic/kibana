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
  const color = percent < 0 ? 'success' : 'danger';
  const icon = percent < 0 ? 'sortUp' : 'sortDown';
  const isSmallPercent = Math.abs(percent) <= 0.01;
  const label = isSmallPercent ? '<0.01' : Math.abs(percent).toFixed(2) + '%';

  return { color, label, icon: isSmallPercent ? undefined : icon };
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
}: {
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  comparisonTopNFunctions?: TopNFunctions;
  topNFunctions?: TopNFunctions;
}): IFunctionRow[] {
  if (!topNFunctions || !topNFunctions.TotalCount || topNFunctions.TotalCount === 0) {
    return [];
  }

  const comparisonDataById = comparisonTopNFunctions
    ? keyBy(comparisonTopNFunctions.TopN, 'Id')
    : {};

  return topNFunctions.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => {
    const comparisonRow = comparisonDataById?.[topN.Id];

    const topNCountExclusiveScaled = scaleValue({
      value: topN.CountExclusive,
      scaleFactor: baselineScaleFactor,
    });

    function calculateDiff() {
      if (comparisonTopNFunctions && comparisonRow) {
        const comparisonCountExclusiveScaled = scaleValue({
          value: comparisonRow.CountExclusive,
          scaleFactor: comparisonScaleFactor,
        });

        return {
          rank: topN.Rank - comparisonRow.Rank,
          samples: topNCountExclusiveScaled - comparisonCountExclusiveScaled,
          selfCPU: comparisonRow.CountExclusive,
          totalCPU: comparisonRow.CountInclusive,
          selfCPUPerc: topN.selfCPUPerc - comparisonRow.selfCPUPerc,
          totalCPUPerc: topN.totalCPUPerc - comparisonRow.totalCPUPerc,
          impactEstimates: comparisonRow.impactEstimates,
        };
      }
    }

    return {
      rank: topN.Rank,
      frame: topN.Frame,
      samples: topNCountExclusiveScaled,
      selfCPUPerc: topN.selfCPUPerc,
      totalCPUPerc: topN.totalCPUPerc,
      selfCPU: topN.CountExclusive,
      totalCPU: topN.CountInclusive,
      impactEstimates: topN.impactEstimates,
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
