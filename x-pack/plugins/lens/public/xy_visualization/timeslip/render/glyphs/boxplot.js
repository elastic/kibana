/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function renderBoxplotGlyph(
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
) {
  const goldenRatio = 1.618; // todo move it into constants
  const boxplotWidth = barMaxWidthPixels / goldenRatio; // - clamp(rightShortfall etc etc)
  const whiskerWidth = boxplotWidth / 2;
  const boxplotLeftX = barX + (barMaxWidthPixels - boxplotWidth) / 2 - leftShortfall;
  const boxplotCenterX = boxplotLeftX + boxplotWidth / 2;
  const { /*min, */ lower, q1, q2, q3, upper /*max */ } = foundRow.boxplot;
  const lowerY = maxBarHeight * yUnitScaleClamped(lower);
  const q1Y = maxBarHeight * yUnitScaleClamped(q1);
  const q2Y = maxBarHeight * yUnitScaleClamped(q2);
  const q3Y = maxBarHeight * yUnitScaleClamped(q3);
  const upperY = maxBarHeight * yUnitScaleClamped(upper);
  // boxplot rectangle body with border
  if (lowerY !== upperY && q1Y !== q2Y && q2Y !== q3Y) {
    const unitVisibility = opacityMultiplier ** 5;
    ctx.beginPath();
    ctx.rect(boxplotLeftX, -q3Y, boxplotWidth, q3Y - q1Y);
    ctx.fillStyle = `rgba(${r},${g},${b},${maxOpacity * unitVisibility})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
    ctx.lineWidth = unitVisibility;
    //ctx.stroke()
    // boxplot whiskers
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.fillRect(boxplotCenterX - whiskerWidth / 2, -upperY, whiskerWidth, unitVisibility); // upper horizontal
    ctx.fillRect(boxplotCenterX - boxplotWidth / 2, -q3Y, boxplotWidth, unitVisibility); // q2 horizontal
    ctx.fillRect(boxplotCenterX - boxplotWidth / 2, -q2Y, boxplotWidth, unitVisibility); // q2 horizontal
    ctx.fillRect(boxplotCenterX - boxplotWidth / 2, -q1Y, boxplotWidth, unitVisibility); // q2 horizontal
    ctx.fillRect(boxplotCenterX - whiskerWidth / 2, -lowerY, whiskerWidth, unitVisibility); // lower horizontal
    ctx.fillRect(boxplotCenterX, -upperY, unitVisibility, upperY - q3Y); // top vertical
    ctx.fillRect(boxplotCenterX, -q1Y, unitVisibility, q1Y - lowerY); // bottom vertical
  }
}
