/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS filter for producing a concise textual description of how the
 * actual value compares to the typical value for a time series anomaly.
 */

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.filter('metricChangeDescription', function () {
  return function (actual, typical) {
    if (actual === typical) {
      // Very unlikely, but just in case.
      return 'actual same as typical';
    }

    // For actual / typical gives output of the form:
    // 4 / 2        2x higher
    // 2 / 10       5x lower
    // 1000 / 1     More than 100x higher
    // 999 / 1000   Unusually low
    // 100 / -100   Unusually high
    // 0 / 100      Unexpected zero value
    // 1 / 0        Unexpected non-zero value
    const isHigher = actual > typical;
    const iconClass = isHigher ? 'fa-arrow-up' : 'fa-arrow-down';
    if (typical !== 0 && actual !== 0) {
      const factor = isHigher ? actual / typical : typical / actual;
      const direction = isHigher ? 'higher' : 'lower';
      if (factor > 1.5) {
        if (factor <= 100) {
          return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> ' + Math.round(factor) + 'x ' + direction;
        } else {
          return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> More than 100x ' + direction;
        }
      }

      if (factor >= 1.05) {
        return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> ' + factor.toPrecision(2) + 'x ' + direction;
      } else {
        const dir = isHigher ? 'high' : 'low';
        return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> Unusually ' + dir;
      }

    } else {
      if (actual === 0) {
        return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> Unexpected zero value';
      } else {
        return '<i class="fa ' + iconClass + '" aria-hidden="true"></i> Unexpected non-zero value';
      }
    }

  };
});

