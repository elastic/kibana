/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getColorPalette, getLinearGradient } from '../../../color_palettes';

interface Props {
  colorPaletteId: string;
}

export const ColorGradient = ({ colorPaletteId }: Props) => {
  const palette = getColorPalette(colorPaletteId);
  return palette.length ? (
    <div className="mapColorGradient" style={{ background: getLinearGradient(palette) }} />
  ) : null;
};
