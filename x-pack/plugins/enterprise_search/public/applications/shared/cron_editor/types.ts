/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Frequency = 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type Field = 'second' | 'minute' | 'hour' | 'day' | 'date' | 'month';
export type FieldToValueMap = {
  [key in Field]?: string;
};
