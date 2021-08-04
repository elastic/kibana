/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import React from 'react';
import { Endzones } from '../../../../../src/plugins/charts/public';
import type { LensMultiTable } from '../../common';
import type { LayerArgs } from '../../common/expressions';

export interface XDomain {
  min?: number;
  max?: number;
  minInterval?: number;
}

export const getXDomain = (
  layers: LayerArgs[],
  data: LensMultiTable,
  minInterval: number | undefined,
  isTimeViz: boolean,
  isHistogram: boolean
) => {
  const baseDomain = isTimeViz
    ? {
        min: data.dateRange?.fromDate.getTime(),
        max: data.dateRange?.toDate.getTime(),
        minInterval,
      }
    : isHistogram
    ? { minInterval }
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
