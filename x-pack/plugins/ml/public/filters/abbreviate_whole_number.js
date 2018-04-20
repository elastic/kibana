/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * AngularJS filter to abbreviate large whole numbers with metric prefixes.
 * Uses numeral.js to format numbers longer than the specified number of
 * digits with metric abbreviations e.g. 12345 as 12k, or 98000000 as 98m.
*/
import numeral from '@elastic/numeral';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.filter('abbreviateWholeNumber', function () {
  return function (value, maxDigits) {
    const maxNumDigits = (maxDigits !== undefined ? maxDigits : 3);
    if (Math.abs(value) < Math.pow(10, maxNumDigits)) {
      return value;
    } else {
      return numeral(value).format('0a');
    }
  };
});

