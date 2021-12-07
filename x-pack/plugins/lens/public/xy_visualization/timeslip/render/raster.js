/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderColumn } from './column.js';
import { clamp } from '../utils/math.js';

export const renderRaster =
  ({
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
  }) =>
  (
    loHi,
    { labeled, binStarts, minorTickLabelFormat, detailedLabelFormat, unit, unitMultiplier },
    i,
    a
  ) => {
    const {
      valid,
      dataResponse: { rows },
    } = dataState;

    const minorLabelFormat = minorTickLabelFormat ?? defaultMinorTickLabelFormat;
    const labelFormat = detailedLabelFormat ?? minorLabelFormat ?? defaultLabelFormat;
    const textNestLevel = a.slice(0, i + 1).filter((layer) => layer.labeled).length;
    const lineNestLevel = a[i] === a[0] ? 0 : textNestLevel;
    const textNestLevelRowLimited = Math.min(guiConfig.maxLabelRowCount, textNestLevel); // max. N rows
    const lineNestLevelRowLimited = Math.min(guiConfig.maxLabelRowCount, lineNestLevel);
    const lineThickness = config.lineThicknessSteps[i];
    const luma =
      config.lumaSteps[i] *
      (guiConfig.darkMode
        ? guiConfig.a11y.contrast === 'low'
          ? 0.5
          : 1
        : guiConfig.a11y.contrast === 'low'
        ? 1.5
        : 1);
    const halfLineThickness = lineThickness / 2;

    // render all bins that start in the visible domain
    let firstInsideBinStart;
    let precedingBinStart;
    let lastBinStart;

    const columnProps = {
      ctx,
      config,
      guiConfig,
      dataState,
      fadeOutPixelWidth,
      emWidth,
      getPixelX,
      labelFormat,
      minorLabelFormat,
      unitBarMaxWidthPixelsSum: loHi.unitBarMaxWidthPixelsSum,
      unitBarMaxWidthPixelsCount: loHi.unitBarMaxWidthPixelsCount,
      labeled,
      textNestLevel,
      textNestLevelRowLimited,
      cartesianWidth,
      cartesianHeight,
      i,
      valid,
      luma,
      lineThickness,
      halfLineThickness,
      lineNestLevelRowLimited,
      domainFrom,
      layers,
      rows,
      yUnitScale,
      yUnitScaleClamped,
    };

    for (const binStart of binStarts(domainFrom, domainTo)) {
      const { timePointSec } = binStart;
      if (domainFrom > timePointSec) {
        precedingBinStart = binStart;
        continue;
      }
      if (timePointSec > domainTo) {
        break;
      }

      if (i === 0) {
        loHi.lo = loHi.lo || binStart;
        loHi.hi = binStart;
      }

      if (!firstInsideBinStart) {
        firstInsideBinStart = binStart;
      }
      const { unitBarMaxWidthPixelsSum, unitBarMaxWidthPixelsCount } = renderColumn(
        columnProps,
        binStart
      );
      loHi.unitBarMaxWidthPixelsSum = unitBarMaxWidthPixelsSum;
      loHi.unitBarMaxWidthPixelsCount = unitBarMaxWidthPixelsCount;

      lastBinStart = binStart;
    }

    // render specially the tick that just precedes the domain, therefore may insert into it (eg. intentionally, via needing to see tick texts)
    if (precedingBinStart) {
      if (i === 0) {
        // condition necessary, otherwise it'll be the binStart of some temporally coarser bin
        loHi.lo = precedingBinStart; // partial bin on the left
      }
      const { unitBarMaxWidthPixelsSum, unitBarMaxWidthPixelsCount } = renderColumn(
        columnProps,
        precedingBinStart,
        0,
        firstInsideBinStart
          ? Math.max(0, getPixelX(firstInsideBinStart.timePointSec) - config.horizontalPixelOffset)
          : Infinity
      );
      loHi.unitBarMaxWidthPixelsSum = unitBarMaxWidthPixelsSum;
      loHi.unitBarMaxWidthPixelsCount = unitBarMaxWidthPixelsCount;
    }

    // render horizontal grids
    const horizontalGrids = true;
    if (horizontalGrids) {
      ctx.save();
      const { r, g, b } = config.backgroundColor;
      const lineStyle = guiConfig.implicit
        ? `rgb(${r},${g},${b})`
        : `rgba(128,128,128,${guiConfig.a11y.contrast === 'low' ? 0.5 : 1})`;
      ctx.textBaseline = 'middle';
      ctx.font = config.cssFontShorthand;
      const overhang = 8; // todo put it in config
      const gap = 8; // todo put it in config
      for (const gridDomainValueY of niceTicks) {
        const yUnit = yUnitScale(gridDomainValueY);
        if (yUnit !== clamp(yUnit, -0.01, 1.01)) {
          // todo set it back to 0 and 1 if recurrence relation of transitioning can reach 1 in finite time
          continue;
        }
        const y = -cartesianHeight * yUnit;
        const text = yTickNumberFormatter.format(gridDomainValueY);
        ctx.fillStyle = gridDomainValueY === 0 ? config.defaultFontColor : lineStyle;
        ctx.fillRect(
          -overhang,
          y,
          cartesianWidth + 2 * overhang,
          gridDomainValueY === 0 ? 0.5 : guiConfig.implicit ? 0.2 : 0.1
        );
        ctx.fillStyle = config.subduedFontColor;
        ctx.textAlign = 'left';
        ctx.fillText(text, cartesianWidth + overhang + gap, y);
        ctx.textAlign = 'right';
        ctx.fillText(text, -overhang - gap, y);
      }
      ctx.restore();
    }

    return loHi;
  };
