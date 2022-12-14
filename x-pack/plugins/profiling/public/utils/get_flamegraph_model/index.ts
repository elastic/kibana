/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import d3 from 'd3';
import { sum, uniqueId } from 'lodash';
import { createColumnarViewModel, rgbToRGBA } from '../../../common/columnar_view_model';
import { ElasticFlameGraph, FlameGraphComparisonMode } from '../../../common/flamegraph';
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

export function getFlamegraphModel({
  primaryFlamegraph,
  comparisonFlamegraph,
  colorSuccess,
  colorDanger,
  colorNeutral,
  comparisonMode,
}: {
  primaryFlamegraph?: ElasticFlameGraph;
  comparisonFlamegraph?: ElasticFlameGraph;
  colorSuccess: string;
  colorDanger: string;
  colorNeutral: string;
  comparisonMode: FlameGraphComparisonMode;
}) {
  const comparisonNodesById: Record<string, { CountInclusive: number; CountExclusive: number }> =
    {};

  if (!primaryFlamegraph || !primaryFlamegraph.Label || primaryFlamegraph.Label.length === 0) {
    return { key: uniqueId(), viewModel: nullColumnarViewModel, comparisonNodesById };
  }

  const viewModel = createColumnarViewModel(primaryFlamegraph, comparisonFlamegraph === undefined);

  if (comparisonFlamegraph) {
    comparisonFlamegraph.ID.forEach((nodeID, index) => {
      comparisonNodesById[nodeID] = {
        CountInclusive: comparisonFlamegraph.CountInclusive[index],
        CountExclusive: comparisonFlamegraph.CountExclusive[index],
      };
    });

    const positiveChangeInterpolator = d3.interpolateRgb(colorNeutral, colorSuccess);

    const negativeChangeInterpolator = d3.interpolateRgb(colorNeutral, colorDanger);

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
      comparisonMode === FlameGraphComparisonMode.Relative
        ? 1
        : primaryFlamegraph.TotalSeconds / comparisonFlamegraph.TotalSeconds;

    primaryFlamegraph.ID.forEach((nodeID, index) => {
      const samples = primaryFlamegraph.CountInclusive[index];
      const comparisonSamples = comparisonNodesById[nodeID]?.CountInclusive as number | undefined;

      const foreground =
        comparisonMode === FlameGraphComparisonMode.Absolute ? samples : samples / totalSamples;
      const background =
        comparisonMode === FlameGraphComparisonMode.Absolute
          ? comparisonSamples
          : (comparisonSamples ?? 0) / comparisonTotalSamples;

      const denominator =
        comparisonMode === FlameGraphComparisonMode.Absolute ? totalSamples : foreground;

      const interpolationValue = getInterpolationValue(
        foreground,
        background === undefined ? undefined : background * weightComparisonSide,
        denominator
      );

      const nodeColor =
        interpolationValue >= 0
          ? positiveChangeInterpolator(interpolationValue)
          : negativeChangeInterpolator(Math.abs(interpolationValue));

      const rgba = rgbToRGBA(Number(nodeColor.replace('#', '0x')));
      viewModel.color.set(rgba, 4 * index);
    });
  }

  return {
    key: uniqueId(),
    viewModel,
    comparisonNodesById,
  };
}
