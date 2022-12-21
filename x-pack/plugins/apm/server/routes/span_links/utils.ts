/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export function getBufferedTimerange({
  start,
  end,
  bufferSize = 4,
}: {
  start: number;
  end: number;
  bufferSize?: number;
}) {
  return {
    startWithBuffer: moment(start).subtract(bufferSize, 'days').valueOf(),
    endWithBuffer: moment(end).add(bufferSize, 'days').valueOf(),
  };
}
