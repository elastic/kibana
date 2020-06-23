/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { SeriesStyle } from '../../../../types';

export const seriesStyleToFlot = (seriesStyle: SeriesStyle) => {
  if (!seriesStyle) {
    return {};
  }

  const lines = get(seriesStyle, 'lines') as SeriesStyle['lines'];
  const bars = get(seriesStyle, 'bars') as SeriesStyle['bars'];
  const fill = get(seriesStyle, 'fill') as SeriesStyle['fill'];
  const color = get(seriesStyle, 'color') as SeriesStyle['color'];
  const stack = get(seriesStyle, 'stack') as SeriesStyle['stack'];
  const horizontal = get(seriesStyle, 'horizontalBars', false) as SeriesStyle['horizontalBars'];

  const flotStyle = {
    numbers: {
      show: true,
    },
    lines: {
      show: lines > 0,
      lineWidth: lines,
      fillColor: color,
      fill: fill / 10,
    },
    bars: {
      show: bars > 0,
      barWidth: bars,
      fill: 1,
      align: 'center',
      horizontal,
    },
    // This is here intentionally even though it is the default.
    // We use the `size` plugins for this and if the user says they want points
    // we just set the size to be static.
    points: { show: false },
    bubbles: {
      show: true,
      fill,
    },
  };

  if (stack != null) {
    (flotStyle as any).stack = stack;
  }
  if (color) {
    (flotStyle as any).color = color;
  }

  return flotStyle;
};
