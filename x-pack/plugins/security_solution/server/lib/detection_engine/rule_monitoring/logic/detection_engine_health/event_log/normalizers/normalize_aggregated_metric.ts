/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity, mapValues } from 'lodash';

import type { AggregatedMetric } from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RawData } from '../../../utils/normalization';

export const normalizeAggregatedMetric = (
  percentilesAggregate: RawData,
  modifier: (value: number) => number = identity
): AggregatedMetric<number> => {
  const rawPercentiles = percentilesAggregate.values || {};
  return {
    percentiles: mapValues(rawPercentiles, (rawValue) => modifier(Number(rawValue || 0))),
  };
};
