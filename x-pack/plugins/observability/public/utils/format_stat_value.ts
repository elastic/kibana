/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { Numeral, Percentage, Bytes } from '../typings/fetch_data_response';

type Stat = Numeral | Percentage | Bytes;

function isBytes(stat: Stat): stat is Bytes {
  return (stat as Bytes).bytes !== undefined;
}

function isPercentage(stat: Stat): stat is Percentage {
  return (stat as Percentage).pct !== undefined;
}

export function formatStatValue(stat: Stat) {
  if (isBytes(stat)) {
    return `${stat.bytes} Mb/s`;
  } else if (isPercentage(stat)) {
    return numeral(stat.pct).format('0.0%');
  } else {
    return numeral(stat.value).format('0a');
  }
}
