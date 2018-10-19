/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timeFormat } from 'd3-time-format';

const formatDate = timeFormat('%Y-%m-%d %H:%M:%S.%L');

export function formatTime(time: number) {
  return formatDate(new Date(time));
}
