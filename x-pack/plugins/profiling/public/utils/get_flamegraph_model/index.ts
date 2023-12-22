/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ColumnarViewModel } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import { compact, range, sum, uniqueId } from 'lodash';
import { describeFrameType, FrameType } from '@kbn/profiling-utils';
import type { ElasticFlameGraph } from '@kbn/profiling-utils';
import { createColumnarViewModel } from '../../../common/columnar_view_model';
import { FRAME_TYPE_COLOR_MAP, rgbToRGBA } from '../../../common/frame_type_colors';
import { ComparisonMode } from '../../components/normalization_menu';
import { getInterpolationValue } from './get_interpolation_value';

const nullColumnarViewModel = {
  label: [],
  value: new Float64Array(),
  color: new Float32Array(),
  position0: new Float32Array(),
  position1: new Float32Array(),
  size0: new Float32Array(),
  size1: new Float32Array(),
};

interface ComparisonNode {
  FileID: string;
  FrameType: number;
  ExeFileName: string;
  AddressOrLine: number;
  FunctionName: string;
  SourceFileName: string;
  SourceLine: number;
  CountInclusive: number;
  CountExclusive: number;
  SelfAnnualCO2Kgs: number;
  TotalAnnualCO2Kgs: number;
  SelfAnnualCostUSD: number;
  TotalAnnualCostUSD: number;
}

export function getFlamegraphModel({
  primaryFlamegraph,
  comparisonFlamegraph,
  colorSuccess,
  colorDanger,
  colorNeutral,
  comparisonMode = ComparisonMode.Absolute,
  comparison,
  baseline,
}: {
  primaryFlamegraph?: ElasticFlameGraph;
  comparisonFlamegraph?: ElasticFlameGraph;
  colorSuccess: string;
  colorDanger: string;
  colorNeutral: string;
  comparisonMode?: ComparisonMode;
  baseline?: number;
  comparison?: number;
}): {
  key: string;
  viewModel: ColumnarViewModel;
  comparisonNodesById: Record<string, ComparisonNode>;
  legendItems: Array<{ label: string; color: string }>;
} {
  const comparisonNodesById: Record<string, ComparisonNode> = {};

  if (!primaryFlamegraph || !primaryFlamegraph.Label || primaryFlamegraph.Label.length === 0) {
    return {
      key: uniqueId(),
      viewModel: nullColumnarViewModel,
      comparisonNodesById,
      legendItems: [],
    };
  }

  const viewModel = createColumnarViewModel(primaryFlamegraph, comparisonFlamegraph === undefined);

  let legendItems: Array<{ label: string; color: string }>;

  if (comparisonFlamegraph) {
    const positiveChangeInterpolator = d3.interpolateRgb(colorNeutral, colorSuccess);

    const negativeChangeInterpolator = d3.interpolateRgb(colorNeutral, colorDanger);

    function getColor(interpolationValue: number) {
      const nodeColor =
        interpolationValue >= 0
          ? positiveChangeInterpolator(interpolationValue)
          : negativeChangeInterpolator(Math.abs(interpolationValue));

      return nodeColor;
    }

    legendItems = range(1, -1, -0.2)
      .concat(-1)
      .map((value) => {
        const rounded = Math.round(value * 100) / 100;
        const color = getColor(rounded);
        return {
          color,
          label:
            rounded === 0
              ? i18n.translate('xpack.profiling.flamegraphModel.noChange', {
                  defaultMessage: 'No change',
                })
              : '',
        };
      });

    comparisonFlamegraph.ID.forEach((nodeID, index) => {
      comparisonNodesById[nodeID] = {
        FileID: comparisonFlamegraph.FileID[index],
        FrameType: comparisonFlamegraph.FrameType[index],
        ExeFileName: comparisonFlamegraph.ExeFilename[index],
        AddressOrLine: comparisonFlamegraph.AddressOrLine[index],
        FunctionName: comparisonFlamegraph.FunctionName[index],
        SourceFileName: comparisonFlamegraph.SourceFilename[index],
        SourceLine: comparisonFlamegraph.SourceLine[index],
        SelfAnnualCO2Kgs: comparisonFlamegraph.SelfAnnualCO2KgsItems[index],
        TotalAnnualCO2Kgs: comparisonFlamegraph.TotalAnnualCO2KgsItems[index],
        SelfAnnualCostUSD: comparisonFlamegraph.SelfAnnualCostsUSDItems[index],
        TotalAnnualCostUSD: comparisonFlamegraph.TotalAnnualCostsUSDItems[index],
        CountInclusive: comparisonFlamegraph.CountInclusive[index],
        CountExclusive: comparisonFlamegraph.CountExclusive[index],
      };
    });

    // per @thomasdullien:
    // In "relative" mode: Take the percentage of CPU time consumed by block A and subtract
    // the percentage of CPU time consumed by block B. If the number is positive, linearly
    // interpolate a color between grey and green, with the delta relative to the size of
    // block A as percentage.

    // Example 1: BlockA 8%, BlockB 5%, delta 3%. This represents a 3/8th reduction, 37.5%
    // of the original time, so the color should be 37.5% "green".

    // Example 2: BlockA 5%, BlockB 8%, delta -3%. This represents a 3/5th worsening of BlockA,
    // so the color should be 62.5% "red". In "absolute" mode: Take the number of samples in
    // blockA, subtract the number of samples in blockB. Divide the result by the number of
    // samples in the first graph. The result is the amount of saturation for the color.
    // Example 3: BlockA 10k samples, BlockB 8k samples, total samples 50k. 10k-8k = 2k, 2k/50k
    // = 4%, therefore 4% "green".

    const totalSamples = sum(primaryFlamegraph.CountExclusive);
    const comparisonTotalSamples = sum(comparisonFlamegraph.CountExclusive);

    const weightComparisonSide =
      comparisonMode === ComparisonMode.Relative ? 1 : (comparison ?? 1) / (baseline ?? 1);

    primaryFlamegraph.ID.forEach((nodeID, index) => {
      const samples = primaryFlamegraph.CountInclusive[index];
      const comparisonSamples = comparisonNodesById[nodeID]?.CountInclusive as number | undefined;

      const foreground =
        comparisonMode === ComparisonMode.Absolute ? samples : samples / totalSamples;
      const background =
        comparisonMode === ComparisonMode.Absolute
          ? comparisonSamples
          : (comparisonSamples ?? 0) / comparisonTotalSamples;

      const denominator = comparisonMode === ComparisonMode.Absolute ? totalSamples : foreground;

      const interpolationValue = getInterpolationValue(
        foreground,
        background === undefined ? undefined : background * weightComparisonSide,
        denominator
      );

      const nodeColor = getColor(interpolationValue);

      const rgba = rgbToRGBA(Number(nodeColor.replace('#', '0x')));
      viewModel.color.set(rgba, 4 * index);
    });
  } else {
    const usedFrameTypes = new Set([...primaryFlamegraph.FrameType]);
    legendItems = compact(
      Object.entries(FRAME_TYPE_COLOR_MAP).map(([frameTypeKey, colors]) => {
        const frameType = Number(frameTypeKey) as FrameType;

        return usedFrameTypes.has(frameType)
          ? {
              color: `#${colors[0].toString(16)}`,
              label: describeFrameType(frameType),
            }
          : undefined;
      })
    );
  }

  return {
    key: uniqueId(),
    viewModel,
    comparisonNodesById,
    legendItems,
  };
}
