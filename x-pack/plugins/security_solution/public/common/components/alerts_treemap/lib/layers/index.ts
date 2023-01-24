/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datum } from '@elastic/charts';

import { getFillColor } from '../chart_palette';
import { getLabel } from '../labels';

export interface DataName {
  dataName: string;
}

export interface Path {
  index: number;
  value: string;
}

export interface FillColorDatum {
  path?: Path[];
}

// common functions used by getLayersOneDimension and getLayersMultiDimensional:
const valueFormatter = (d: number) => `${d}`;
const groupByRollup = (d: Datum) => d.key;

/**
 * Extracts the first group name from the data representing the second group
 */
export const getGroupFromPath = (datum: FillColorDatum): string | undefined => {
  const OFFSET_FROM_END = 2; // The offset from the end of the path array containing the group

  const pathLength = datum.path?.length ?? 0;
  const groupIndex = pathLength - OFFSET_FROM_END;

  return Array.isArray(datum.path) && groupIndex > 0 ? datum.path[groupIndex].value : undefined;
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
      fillColor: (d: DataName) =>
        getFillColor({
          riskScore: maxRiskSubAggregations[d.dataName] ?? 0,
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
      fillColor: (d: FillColorDatum) => {
        const groupFromPath = getGroupFromPath(d) ?? '';

        return getFillColor({
          riskScore: maxRiskSubAggregations[groupFromPath] ?? 0,
          colorPalette,
        });
      },
    },
  },
];
