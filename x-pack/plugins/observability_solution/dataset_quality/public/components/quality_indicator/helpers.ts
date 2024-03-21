/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash';
import {
  POOR_QUALITY_MINIMUM_PERCENTAGE,
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
} from '../../../common/constants';
import { QualityIndicators } from '../common';

export const mapPercentageToQuality = (percentage: number): QualityIndicators => {
  return percentage > POOR_QUALITY_MINIMUM_PERCENTAGE
    ? 'poor'
    : percentage > DEGRADED_QUALITY_MINIMUM_PERCENTAGE
    ? 'degraded'
    : 'good';
};

export const mapPercentagesToQualityCounts = (
  percentages: number[]
): Record<QualityIndicators, number> =>
  countBy(percentages.map(mapPercentageToQuality)) as Record<QualityIndicators, number>;
