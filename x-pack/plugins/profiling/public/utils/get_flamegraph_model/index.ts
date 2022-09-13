/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ColumnarViewModel } from '@elastic/charts';
import d3 from 'd3';
import { uniqueId } from 'lodash';
import { ElasticFlameGraph, FlameGraphComparisonMode, rgbToRGBA } from '../../../common/flamegraph';
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
  const comparisonNodesById: Record<
    string,
    { Value: number; CountInclusive: number; CountExclusive: number }
  > = {};

  if (!primaryFlamegraph || !primaryFlamegraph.Label || primaryFlamegraph.Label.length === 0) {
    return { key: uniqueId(), viewModel: nullColumnarViewModel, comparisonNodesById };
  }

  let colors: number[] | undefined = primaryFlamegraph.Color;

  if (comparisonFlamegraph) {
    colors = [];

    comparisonFlamegraph.ID.forEach((nodeID, index) => {
      comparisonNodesById[nodeID] = {
        Value: comparisonFlamegraph.Value[index],
        CountInclusive: comparisonFlamegraph.CountInclusive[index],
        CountExclusive: comparisonFlamegraph.CountExclusive[index],
      };
    });

    const positiveChangeInterpolator = d3.interpolateRgb(colorNeutral, colorDanger);

    const negativeChangeInterpolator = d3.interpolateRgb(colorNeutral, colorSuccess);

    const comparisonExclusive: number[] = [];
    const comparisonInclusive: number[] = [];

    primaryFlamegraph.ID.forEach((nodeID, index) => {
      const countInclusive = primaryFlamegraph.CountInclusive[index];
      const countExclusive = primaryFlamegraph.CountExclusive[index];

      const comparisonNode = comparisonNodesById[nodeID];

      comparisonExclusive![index] = comparisonNode?.CountExclusive;
      comparisonInclusive![index] = comparisonNode?.CountInclusive;

      const [foreground, background] =
        comparisonMode === FlameGraphComparisonMode.Absolute
          ? [countInclusive, comparisonNode?.CountInclusive]
          : [countExclusive, comparisonNode?.CountExclusive];

      const interpolationValue = getInterpolationValue(foreground, background);

      const nodeColor =
        interpolationValue >= 0
          ? positiveChangeInterpolator(interpolationValue)
          : negativeChangeInterpolator(Math.abs(interpolationValue));

      colors!.push(...rgbToRGBA(Number(nodeColor.replace('#', '0x'))));
    });
  }

  const value = new Float64Array(primaryFlamegraph.Value);
  const position = new Float32Array(primaryFlamegraph.Position);
  const size = new Float32Array(primaryFlamegraph.Size);
  const color = new Float32Array(colors);

  return {
    key: uniqueId(),
    viewModel: {
      label: primaryFlamegraph.Label,
      value,
      color,
      position0: position,
      position1: position,
      size0: size,
      size1: size,
    } as ColumnarViewModel,
    comparisonNodesById,
  };
}
