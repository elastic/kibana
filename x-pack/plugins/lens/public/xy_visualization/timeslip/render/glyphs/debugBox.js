/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function renderDebugBox(ctx, cartesianWidth, cartesianHeight) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cartesianWidth, cartesianHeight);
  ctx.strokeStyle = 'magenta';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
