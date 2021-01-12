/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FileBasedFieldVisConfig } from './types';
import { roundToDecimalPlace } from '../../formatters/round_to_decimal_place';

export const getTFPercentage = (config: FileBasedFieldVisConfig) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { count } = stats;
  // use stats from index based config
  let { trueCount, falseCount } = stats;

  // use stats from file based find structure results
  if (stats.trueCount === undefined || stats.falseCount === undefined) {
    if (config?.stats?.topValues) {
      config.stats.topValues.forEach((doc) => {
        if (doc.doc_count !== undefined) {
          if (doc.key === 'false') {
            falseCount = doc.doc_count;
          }
          if (doc.key === 'true') {
            trueCount = doc.doc_count;
          }
        }
      });
    }
  }
  if (count === undefined || trueCount === undefined || falseCount === undefined) return null;
  return {
    truePercentage: roundToDecimalPlace((trueCount / count) * 100),
    falsePercentage: roundToDecimalPlace((falseCount / count) * 100),
  };
};
