/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { TIME_FORMAT } from '../constants/time_format';

export const timeFormatter = (value: number) => {
  return formatDate(value, TIME_FORMAT);
};
