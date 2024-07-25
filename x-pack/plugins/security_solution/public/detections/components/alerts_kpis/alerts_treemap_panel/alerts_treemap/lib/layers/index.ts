/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum, Key, ArrayNode } from '@elastic/charts';

import { getFillColor } from '../chart_palette';
import { getLabel } from '../labels';

// common functions used by getLayersOneDimension and getLayersMultiDimensional:
const valueFormatter = (d: number) => `${d}`;
const groupByRollup = (d: Datum) => d.key;

/**
 * Extracts the first group name from the data representing the second group
 */
export const getGroupFromPath = (path: ArrayNode['path']): string | undefined => {
  const OFFSET_FROM_END = 2; // The offset from the end of the path array containing the group
  const groupIndex = path.length - OFFSET_FROM_END;
  return groupIndex > 0 ? path[groupIndex].value : undefined;
};

export const getLayersOneDimension = ({
  colorPalette,
  maxRiskSubAggregations,
}: {
  colorPalette: string[];
  maxRiskSubAggregations: Record<string, number | undefined>;
}) => [
  {
    fillLabel: {
      valueFormatter,
    },
    groupByRollup,
    nodeLabel: (d: Datum) => getLabel({ baseLabel: d, riskScore: maxRiskSubAggregations[d] }),
    shape: {
      fillColor: (dataName: Key) =>
        getFillColor({
          riskScore: maxRiskSubAggregations[dataName] ?? 0,
          colorPalette,
        }),
    },
  },
];

export const getLayersMultiDimensional = ({
  colorPalette,
  layer0FillColor,
  maxRiskSubAggregations,
}: {
  colorPalette: string[];
  layer0FillColor: string;
  maxRiskSubAggregations: Record<string, number | undefined>;
}) => [
  {
    fillLabel: {
      valueFormatter,
    },
    groupByRollup,
    nodeLabel: (d: Datum) => getLabel({ baseLabel: d, riskScore: maxRiskSubAggregations[d] }),
    shape: {
      fillColor: layer0FillColor,
    },
  },
  {
    fillLabel: {
      valueFormatter,
    },
    groupByRollup: (d: Datum) => d.stackByField1Key, // different implementation than layer 0
    nodeLabel: (d: Datum) => `${d}`,
    shape: {
      fillColor: (dataName: Key, sortIndex: number, node: Pick<ArrayNode, 'path'>) => {
        const groupFromPath = getGroupFromPath(node.path) ?? '';

        return getFillColor({
          riskScore: maxRiskSubAggregations[groupFromPath] ?? 0,
          colorPalette,
        });
      },
    },
  },
];
