/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderBoxplotGlyph } from './glyphs/boxplot.js';
import { renderBarGlyph } from './glyphs/bar.js';

export const renderColumn = (
  {
    ctx,
    config,
    guiConfig,
    dataState,
    emWidth,
    fadeOutPixelWidth,
    getPixelX,
    labelFormat,
    minorLabelFormat,
    unitBarMaxWidthPixelsSum,
    unitBarMaxWidthPixelsCount,
    labeled,
    textNestLevel,
    textNestLevelRowLimited,
    cartesianWidth,
    cartesianHeight,
    i,
    valid,
    luma,
    lineThickness,
    lineNestLevelRowLimited,
    halfLineThickness,
    domainFrom,
    layers,
    rows,
    yUnitScale,
    yUnitScaleClamped,
  },
  { fontColor, timePointSec, nextTimePointSec },
  pixelX = getPixelX(timePointSec),
  maxWidth = Infinity
) => {
  if (labeled && textNestLevel <= guiConfig.maxLabelRowCount) {
    const text =
      textNestLevelRowLimited === guiConfig.maxLabelRowCount
        ? labelFormat(timePointSec * 1000)
        : minorLabelFormat(timePointSec * 1000);
    if (text.length > 0) {
      const textX = pixelX + config.horizontalPixelOffset;
      const y = config.verticalPixelOffset + (textNestLevelRowLimited - 1) * config.rowPixelPitch;
      const leftShortening =
        maxWidth === Infinity
          ? 0
          : Math.max(0, ctx.measureText(text).width + config.horizontalPixelOffset - maxWidth);
      const rightShortening =
        textX + Math.min(maxWidth, text.length * emWidth) < cartesianWidth
          ? 0
          : Math.max(0, textX + ctx.measureText(text).width - cartesianWidth);
      const maxWidthRight = Math.max(0, cartesianWidth - textX);
      const clipLeft = config.clipLeft && leftShortening > 0;
      const clipRight = config.clipRight && rightShortening > 0;
      if (clipLeft) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          config.horizontalPixelOffset,
          y - 0.35 * config.rowPixelPitch,
          maxWidth,
          config.rowPixelPitch
        );
        ctx.clip();
      }
      if (clipRight) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(textX, y - 0.35 * config.rowPixelPitch, maxWidthRight, config.rowPixelPitch);
        ctx.clip();
      }
      ctx.fillStyle =
        fontColor ??
        (guiConfig.a11y.contrast === 'low' ? config.subduedFontColor : config.defaultFontColor);
      ctx.fillText(text, textX - leftShortening, y);
      if (clipRight) {
        const { r, g, b } = config.backgroundColor;
        const fadeOutRight = ctx.createLinearGradient(textX, 0, textX + maxWidthRight, 0);
        fadeOutRight.addColorStop(0, `rgba(${r},${g},${b},0)`);
        fadeOutRight.addColorStop(
          maxWidthRight === 0 ? 0.5 : Math.max(0, 1 - fadeOutPixelWidth / maxWidthRight),
          `rgba(${r},${g},${b},0)`
        );
        fadeOutRight.addColorStop(1, `rgba(${r},${g},${b},1)`);
        ctx.fillStyle = fadeOutRight;
        ctx.fill();
        ctx.restore();
      }
      if (clipLeft) {
        const { r, g, b } = config.backgroundColor;
        const fadeOutLeft = ctx.createLinearGradient(0, 0, maxWidth, 0);
        fadeOutLeft.addColorStop(0, `rgba(${r},${g},${b},1)`);
        fadeOutLeft.addColorStop(
          maxWidth === 0 ? 0.5 : Math.min(1, fadeOutPixelWidth / maxWidth),
          `rgba(${r},${g},${b},0)`
        );
        fadeOutLeft.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = fadeOutLeft;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // draw bars
  const barPad = guiConfig.implicit ? halfLineThickness : 0;
  const fullBarPixelX = getPixelX(timePointSec);
  const barMaxWidthPixels = getPixelX(nextTimePointSec) - fullBarPixelX - 2 * barPad;
  if (i === 0) {
    unitBarMaxWidthPixelsSum += barMaxWidthPixels;
    unitBarMaxWidthPixelsCount++;
  }
  renderBar: if (
    i === 0 &&
    valid &&
    dataState.binUnit === layers[0].unit &&
    dataState.binUnitCount === layers[0].unitMultiplier
  ) {
    const foundRow = rows.find(
      (r) => timePointSec * 1000 <= r.epochMs && r.epochMs < nextTimePointSec * 1000
    );
    if (!foundRow) {
      break renderBar; // comment it out if the goal is to see zero values where data is missing
    }
    ctx.save();

    // left side special case
    const leftShortfall = Math.abs(pixelX - fullBarPixelX);
    const leftOpacityMultiplier = leftShortfall
      ? 1 - Math.max(0, Math.min(1, leftShortfall / barMaxWidthPixels))
      : 1;

    // right side special case
    const barX = pixelX + barPad;
    const rightShortfall = Math.max(0, barX + barMaxWidthPixels - cartesianWidth);

    const maxBarHeight = cartesianHeight;
    const barWidthPixels = barMaxWidthPixels - rightShortfall;

    const rightOpacityMultiplier = rightShortfall
      ? 1 - Math.max(0, Math.min(1, rightShortfall / barMaxWidthPixels))
      : 1;
    const { r, g, b } = config.barChroma;
    const maxOpacity = config.barFillAlpha;
    const opacityMultiplier = leftOpacityMultiplier * rightOpacityMultiplier;
    const opacity = maxOpacity * opacityMultiplier;
    const opacityDependentLineThickness =
      opacityMultiplier === 1 ? 1 : Math.sqrt(opacityMultiplier);
    if (guiConfig.queryConfig.boxplot && foundRow.boxplot) {
      renderBoxplotGlyph(
        ctx,
        barMaxWidthPixels,
        barX,
        leftShortfall,
        foundRow,
        maxBarHeight,
        yUnitScaleClamped,
        opacityMultiplier,
        r,
        g,
        b,
        maxOpacity
      );
    } else {
      renderBarGlyph(
        ctx,
        barWidthPixels,
        leftShortfall,
        maxBarHeight,
        yUnitScale,
        foundRow,
        yUnitScaleClamped,
        r,
        g,
        b,
        opacity,
        barX,
        opacityDependentLineThickness
      );
    }
    ctx.restore();
  }

  // render vertical grid lines
  // the measured text width, plus the `config.horizontalPixelOffset` on the left side must fit inside `maxWidth`
  if (domainFrom < timePointSec) {
    ctx.fillStyle = `rgb(${luma},${luma},${luma})`;
    ctx.fillRect(
      pixelX - halfLineThickness,
      -cartesianHeight,
      lineThickness,
      cartesianHeight + lineNestLevelRowLimited * config.rowPixelPitch
    );
    if (guiConfig.implicit && lineNestLevelRowLimited > 0) {
      const verticalSeparation = 1; // todo config
      ctx.fillStyle = 'lightgrey'; // todo config
      ctx.fillRect(
        pixelX - halfLineThickness,
        verticalSeparation,
        lineThickness,
        lineNestLevelRowLimited * config.rowPixelPitch - verticalSeparation
      );
    }
  }

  return {
    unitBarMaxWidthPixelsSum,
    unitBarMaxWidthPixelsCount,
  };
};
