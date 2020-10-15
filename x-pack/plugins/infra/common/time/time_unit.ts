/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum TimeUnit {
  Millisecond = 1,
  Second = Millisecond * 1000,
  Minute = Second * 60,
  Hour = Minute * 60,
  Day = Hour * 24,
  Month = Day * 30,
  Year = Month * 12,
}

export type ElasticsearchTimeUnit = 's' | 'm' | 'h' | 'd' | 'M' | 'y';

export const timeUnitLabels = {
  [TimeUnit.Millisecond]: 'ms',
  [TimeUnit.Second]: 's',
  [TimeUnit.Minute]: 'm',
  [TimeUnit.Hour]: 'h',
  [TimeUnit.Day]: 'd',
  [TimeUnit.Month]: 'M',
  [TimeUnit.Year]: 'y',
};

export const elasticSearchTimeUnits: {
  [key: string]: ElasticsearchTimeUnit;
} = {
  [TimeUnit.Second]: 's',
  [TimeUnit.Minute]: 'm',
  [TimeUnit.Hour]: 'h',
  [TimeUnit.Day]: 'd',
  [TimeUnit.Month]: 'M',
  [TimeUnit.Year]: 'y',
};

export const getElasticSearchTimeUnit = (scale: TimeUnit): ElasticsearchTimeUnit =>
  elasticSearchTimeUnits[scale];
