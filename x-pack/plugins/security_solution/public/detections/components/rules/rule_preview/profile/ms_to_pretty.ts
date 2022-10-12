/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function msToPretty(ms: number, precision: number) {
  if (!precision) {
    precision = 1;
  }
  ms = Number(ms);
  if (ms < 1000) {
    return { time: `${ms.toFixed(precision)}ms`, badgeColor: 'success' };
  }

  ms /= 1000;
  if (ms < 60) {
    const second = Number(ms.toFixed(precision));
    if (second <= 5) return { time: `${second}s`, badgeColor: 'healthy' };
    else if (5 < second && second <= 10) return { time: `${second}s`, badgeColor: 'warning' };
    else return { time: `${second}s`, badgeColor: 'danger' };
  }

  ms /= 60;
  if (ms < 60) {
    return { time: `${ms.toFixed(precision)}min`, badgeColor: 'danger' };
  }

  ms /= 60;
  if (ms < 24) {
    return { time: `${ms.toFixed(precision)}hr`, badgeColor: 'danger' };
  }

  ms /= 24;
  return { time: `${ms.toFixed(precision)}d`, badgeColor: 'danger' };
}
