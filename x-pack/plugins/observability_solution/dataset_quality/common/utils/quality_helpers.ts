/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { POOR_QUALITY_MINIMUM_PERCENTAGE, DEGRADED_QUALITY_MINIMUM_PERCENTAGE } from '../constants';
import { QualityIndicators } from '../types';

export const mapPercentageToQuality = (percentages: number[]): QualityIndicators => {
  if (percentages.some((percentage) => percentage > POOR_QUALITY_MINIMUM_PERCENTAGE)) {
    return 'poor';
  }

  if (percentages.some((percentage) => percentage > DEGRADED_QUALITY_MINIMUM_PERCENTAGE)) {
    return 'degraded';
  }

  return 'good';
};
