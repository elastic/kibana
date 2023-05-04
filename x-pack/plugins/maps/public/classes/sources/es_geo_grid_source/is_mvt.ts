/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

export function isMvt(renderAs: RENDER_AS, resolution: GRID_RESOLUTION): boolean {
  // heatmap uses MVT regardless of resolution because heatmap only supports counting metrics
  if (renderAs === RENDER_AS.HEATMAP) {
    return true;
  }

  // hex uses MVT regardless of resolution because hex never supported "top terms" metric
  if (renderAs === RENDER_AS.HEX) {
    return true;
  }

  // point and grid only use mvt at high resolution because lower resolutions may contain mvt unsupported "top terms" metric
  return resolution === GRID_RESOLUTION.SUPER_FINE;
}
