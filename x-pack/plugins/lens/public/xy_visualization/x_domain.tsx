/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import React from 'react';
import moment from 'moment';
import { Endzones } from '../../../../../src/plugins/charts/public';
import type { LensMultiTable } from '../../common';
import type { DataLayerArgs } from '../../common/expressions';
import { search } from '../../../../../src/plugins/data/public';

export interface XDomain {
  min?: number;
  max?: number;
  minInterval?: number;
}

export const getAppliedTimeRange = (layers: DataLayerArgs[], data: LensMultiTable) => {
  return Object.entries(data.tables)
    .map(([tableId, table]) => {
      const layer = layers.find((l) => l.layerId === tableId);
      const xColumn = table.columns.find((col) => col.id === layer?.xAccessor);
      const timeRange =
        xColumn && search.aggs.getDateHistogramMetaDataByDatatableColumn(xColumn)?.timeRange;
      if (timeRange) {
        return {
          timeRange,
          field: xColumn.meta.field,
        };
      }
    })
    .find(Boolean);
};

export const getXDomain = (
  layers: DataLayerArgs[],
  data: LensMultiTable,
  minInterval: number | undefined,
  isTimeViz: boolean,
  isHistogram: boolean
) => {
  const appliedTimeRange = getAppliedTimeRange(layers, data)?.timeRange;
  const from = appliedTimeRange?.from;
  const to = appliedTimeRange?.to;
  const baseDomain = isTimeViz
    ? {
        min: from ? moment(from).valueOf() : NaN,
        max: to ? moment(to).valueOf() : NaN,
        minInterval,
      }
    : isHistogram
    ? { minInterval, min: NaN, max: NaN }
    : undefined;

  if (isHistogram && isFullyQualified(baseDomain)) {
    const xValues = uniq(
      layers
        .flatMap((layer) =>
          data.tables[layer.layerId].rows.map((row) => row[layer.xAccessor!].valueOf() as number)
        )
        .sort()
    );

    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, baseDomain.min);
    const domainMaxValue = baseDomain.max - baseDomain.minInterval;
    const domainMax = Math.max(domainMaxValue, lastXValue);

    return {
      extendedDomain: {
        min: domainMin,
        max: domainMax,
        minInterval: baseDomain.minInterval,
      },
      baseDomain,
    };
  }

  return {
    baseDomain,
    extendedDomain: baseDomain,
  };
};

function isFullyQualified(
  xDomain: XDomain | undefined
): xDomain is { min: number; max: number; minInterval: number } {
  return Boolean(
    xDomain &&
      typeof xDomain.min === 'number' &&
      typeof xDomain.max === 'number' &&
      xDomain.minInterval
  );
}

export const XyEndzones = function ({
  baseDomain,
  extendedDomain,
  histogramMode,
  darkMode,
}: {
  baseDomain?: XDomain;
  extendedDomain?: XDomain;
  histogramMode: boolean;
  darkMode: boolean;
}) {
  return isFullyQualified(baseDomain) && isFullyQualified(extendedDomain) ? (
    <Endzones
      isFullBin={!histogramMode}
      isDarkMode={darkMode}
      domainStart={baseDomain.min}
      domainEnd={baseDomain.max}
      interval={extendedDomain.minInterval}
      domainMin={extendedDomain.min}
      domainMax={extendedDomain.max}
      hideTooltips={false}
    />
  ) : null;
};
