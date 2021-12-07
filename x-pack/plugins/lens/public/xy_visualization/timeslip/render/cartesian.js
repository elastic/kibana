/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderRaster } from './raster.js';

export const renderCartesian = (
  ctx,
  config,
  dataState,
  guiConfig,
  defaultMinorTickLabelFormat,
  emWidth,
  fadeOutPixelWidth,
  defaultLabelFormat,
  yTickNumberFormatter,
  rasterSelector,
  cartesianWidth,
  cartesianHeight,
  { domainFrom, domainTo },
  yUnitScale,
  yUnitScaleClamped,
  niceTicks
) => {
  ctx.textBaseline = 'top';
  ctx.fillStyle = config.defaultFontColor;
  ctx.font = config.cssFontShorthand;
  ctx.textAlign = 'left';

  const timeExtent = domainTo - domainFrom;

  const getPixelX = (timePointSec) => {
    const continuousOffset = timePointSec - domainFrom;
    const ratio = continuousOffset / timeExtent;
    return cartesianWidth * ratio;
  };

  const notTooDense =
    (domainFrom, domainTo) =>
    ({ minimumPixelsPerSecond }) => {
      const domainInSeconds = domainTo - domainFrom;
      const pixelsPerSecond = cartesianWidth / domainInSeconds;
      return pixelsPerSecond > minimumPixelsPerSecond;
    };

  const layers = rasterSelector(notTooDense(domainFrom, domainTo));

  const loHi = layers.reduce(
    renderRaster({
      ctx,
      config,
      guiConfig,
      dataState,
      fadeOutPixelWidth,
      emWidth,
      defaultMinorTickLabelFormat,
      defaultLabelFormat,
      yTickNumberFormatter,
      domainFrom,
      domainTo,
      getPixelX,
      cartesianWidth,
      cartesianHeight,
      niceTicks,
      yUnitScale,
      yUnitScaleClamped,
      layers,
    }),
    { lo: null, hi: null, unitBarMaxWidthPixelsSum: 0, unitBarMaxWidthPixelsCount: 0 }
  );

  return {
    lo: loHi.lo,
    hi: loHi.hi,
    binUnit: layers[0].unit,
    binUnitCount: layers[0].unitMultiplier,
    unitBarMaxWidthPixels: loHi.unitBarMaxWidthPixelsSum / loHi.unitBarMaxWidthPixelsCount,
  };
};
