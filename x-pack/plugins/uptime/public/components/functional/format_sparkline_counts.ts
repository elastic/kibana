/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSeriesPoint } from '../../../common/graphql/types';

export const formatSparklineCounts = (seriesPoints: MonitorSeriesPoint[]) => {
  let defaultSize = 0;
  const { length } = seriesPoints;
  // assume points are uniform, use this
  // for the last element's span
  if (length > 1) {
    defaultSize = Math.max(seriesPoints[1].x - seriesPoints[0].x, 0);
  } else if (length === 1) {
    // wait for another point
    return [];
  }
  return seriesPoints.map(({ x: x0, y: yVal }, index, array) => {
    let x;
    const nextIndex = index + 1;
    if (nextIndex === array.length) {
      x = x0 + defaultSize;
    } else {
      const { x: nextX } = array[nextIndex];
      x = nextX;
    }
    return { x, x0, y: yVal || 0 };
  });
};
