/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiStrings } from '../../translations.js';

export function renderTimeUnitAnnotation(
  ctx,
  config,
  binUnitCount,
  binUnit,
  chartTopFontSize,
  unitBarMaxWidthPixels
) {
  ctx.save();
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.font = config.monospacedFontShorthand;
  ctx.fillStyle =
    config.a11y.contrast === 'low' ? config.subduedFontColor : config.defaultFontColor;
  ctx.fillText(
    `1 ${uiStrings[config.locale].bar} = ${binUnitCount} ${
      uiStrings[config.locale][binUnit + (binUnitCount !== 1 ? 's' : '')]
    }`,
    0,
    -chartTopFontSize * 0.5
  );
  const unitBarY = -chartTopFontSize * 2.2;
  ctx.fillRect(0, unitBarY, unitBarMaxWidthPixels, 1);
  ctx.fillRect(0, unitBarY - 3, 1, 7);
  ctx.fillRect(unitBarMaxWidthPixels - 1, unitBarY - 3, 1, 7);
  ctx.restore();
}
