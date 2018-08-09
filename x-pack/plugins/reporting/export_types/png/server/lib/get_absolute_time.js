/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import datemath from '@kbn/datemath';

export function getAbsoluteTime(time) {
  const mode = get(time, 'mode');
  const timeFrom = get(time, 'from');
  const timeTo = get(time, 'to');

  if (!mode || !timeFrom || !timeTo) return time;
  if (mode === 'absolute') {
    return time;
  }

  const output = { mode: 'absolute' };
  output.from = datemath.parse(timeFrom);
  output.to = datemath.parse(timeTo, { roundUp: true });

  return output;
}
