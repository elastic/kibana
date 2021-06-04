/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const determineTimestampDisplay = (timestamp: string) => {
  const isTimestampToday = moment().subtract(1, 'days').isBefore(timestamp);
  return isTimestampToday ? moment(timestamp).fromNow() : moment(timestamp).format('ll');
};
