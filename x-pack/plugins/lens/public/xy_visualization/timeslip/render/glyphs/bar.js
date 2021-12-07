/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function renderBarGlyph(
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
) {
  const renderedBarWidth = Math.max(0, barWidthPixels - leftShortfall);
  const barEnd = -maxBarHeight * yUnitScale(foundRow.sum);
  const clampedBarEnd = -maxBarHeight * yUnitScaleClamped(foundRow.sum);
  const clampedBarStart = -maxBarHeight * yUnitScaleClamped(0);
  const barHeight = Math.abs(clampedBarStart - clampedBarEnd);
  const barY = Math.min(clampedBarStart, clampedBarEnd);
  ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
  ctx.fillRect(barX, barY, renderedBarWidth, barHeight);
  if (clampedBarEnd === barEnd) {
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.fillRect(barX, clampedBarEnd, renderedBarWidth, opacityDependentLineThickness); // avoid Math.sqrt
  }
}
