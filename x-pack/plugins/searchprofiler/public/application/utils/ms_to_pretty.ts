/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function msToPretty(ms: number, precision: number) {
  if (!precision) {
    precision = 1;
  }
  ms = Number(ms);
  if (ms < 1000) {
    return ms.toFixed(precision) + 'ms';
  }

  ms /= 1000;
  if (ms < 60) {
    return ms.toFixed(precision) + 's';
  }

  ms /= 60;
  if (ms < 60) {
    return ms.toFixed(precision) + 'min';
  }

  ms /= 60;
  if (ms < 24) {
    return ms.toFixed(precision) + 'hr';
  }

  ms /= 24;
  return ms.toFixed(precision) + 'd';
}
