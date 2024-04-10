/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { convertTonsToKgs, ESTopNFunctions, Frame } from '@kbn/profiling-utils';
import {
  CalculateImpactEstimates,
  ImpactEstimates,
} from '../../hooks/use_calculate_impact_estimates';

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

export const getTotalCount = (topNFunctions?: ESTopNFunctions) => topNFunctions?.total_count ?? 0;

export interface IFunctionRow {
  id: string;
  rank: number;
  frame: Frame;
  samples: number;
  selfCPU: number;
  totalCPU: number;
  selfCPUPerc: number;
  totalCPUPerc: number;
  impactEstimates?: ImpactEstimates;
  selfAnnualCO2kgs: number;
  selfAnnualCostUSD: number;
  totalAnnualCO2kgs: number;
  totalAnnualCostUSD: number;
  diff?: {
    rank: number;
    samples: number;
    selfCPU: number;
    totalCPU: number;
    selfCPUPerc: number;
    totalCPUPerc: number;
    impactEstimates?: ImpactEstimates;
    selfAnnualCO2kgs: number;
    selfAnnualCostUSD: number;
    totalAnnualCO2kgs: number;
    totalAnnualCostUSD: number;
  };
}

export function getFunctionsRows({
  baselineScaleFactor,
  comparisonScaleFactor,
  comparisonTopNFunctions,
  topNFunctions,
  totalSeconds,
  calculateImpactEstimates,
}: {
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  comparisonTopNFunctions?: ESTopNFunctions;
  topNFunctions?: ESTopNFunctions;
  totalSeconds: number;
  calculateImpactEstimates: CalculateImpactEstimates;
}): IFunctionRow[] {
  if (!topNFunctions || !topNFunctions.total_count || topNFunctions.total_count === 0) {
    return [];
  }

  const comparisonDataById = comparisonTopNFunctions
    ? keyBy(comparisonTopNFunctions.topn, 'id')
    : {};

  return topNFunctions.topn
    .filter((topN) => topN.self_count >= 0)
    .map((topN, i) => {
      const comparisonRow = comparisonDataById?.[topN.id];

      const scaledSelfCPU = scaleValue({
        value: topN.self_count,
        scaleFactor: baselineScaleFactor,
      });

      const totalCPUPerc = (topN.total_count / topNFunctions.total_count) * 100;
      const selfCPUPerc = (topN.self_count / topNFunctions.total_count) * 100;

      const impactEstimates =
        totalSeconds > 0
          ? calculateImpactEstimates({
              countExclusive: topN.self_count,
              countInclusive: topN.total_count,
              totalSamples: topNFunctions.total_count,
              totalSeconds,
            })
          : undefined;

      function calculateDiff() {
        if (comparisonTopNFunctions && comparisonRow) {
          const comparisonScaledSelfCPU = scaleValue({
            value: comparisonRow.self_count,
            scaleFactor: comparisonScaleFactor,
          });

          const scaledDiffSamples = scaledSelfCPU - comparisonScaledSelfCPU;

          return {
            id: comparisonRow.id,
            rank: topN.rank - comparisonRow.rank,
            samples: scaledDiffSamples,
            selfCPU: comparisonRow.self_count,
            totalCPU: comparisonRow.total_count,
            selfCPUPerc:
              selfCPUPerc - (comparisonRow.self_count / comparisonTopNFunctions.total_count) * 100,
            totalCPUPerc:
              totalCPUPerc -
              (comparisonRow.total_count / comparisonTopNFunctions.total_count) * 100,
            selfAnnualCO2kgs: convertTonsToKgs(comparisonRow.self_annual_co2_tons),
            selfAnnualCostUSD: comparisonRow.self_annual_costs_usd,
            totalAnnualCO2kgs: convertTonsToKgs(comparisonRow.total_annual_co2_tons),
            totalAnnualCostUSD: comparisonRow.total_annual_costs_usd,
          };
        }
      }

      return {
        id: topN.id,
        rank: topN.rank,
        frame: topN.frame,
        samples: scaledSelfCPU,
        selfCPUPerc,
        totalCPUPerc,
        selfCPU: topN.self_count,
        totalCPU: topN.total_count,
        impactEstimates,
        selfAnnualCO2kgs: convertTonsToKgs(topN.self_annual_co2_tons),
        selfAnnualCostUSD: topN.self_annual_costs_usd,
        totalAnnualCO2kgs: convertTonsToKgs(topN.total_annual_co2_tons),
        totalAnnualCostUSD: topN.total_annual_costs_usd,
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

export function convertRowToFrame(row: IFunctionRow) {
  return {
    addressOrLine: row.frame.address_or_line,
    countExclusive: row.selfCPU,
    countInclusive: row.totalCPU,
    exeFileName: row.frame.executable_file_name,
    frameType: row.frame.frame_type,
    functionName: row.frame.function_name,
    sourceFileName: row.frame.file_name,
    sourceLine: row.frame.line_number,
    selfAnnualCO2Kgs: row.selfAnnualCO2kgs,
    totalAnnualCO2Kgs: row.totalAnnualCO2kgs,
    selfAnnualCostUSD: row.selfAnnualCostUSD,
    totalAnnualCostUSD: row.totalAnnualCostUSD,
  };
}
