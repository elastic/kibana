/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
  POOR_QUALITY_MINIMUM_PERCENTAGE,
} from '../../../common/constants';
import { QualityIndicator } from './indicator';

export function QualityPercentageIndicator({ percentage = 0 }: { percentage?: number }) {
  const quality =
    percentage > POOR_QUALITY_MINIMUM_PERCENTAGE
      ? 'poor'
      : percentage > DEGRADED_QUALITY_MINIMUM_PERCENTAGE
      ? 'degraded'
      : 'good';

  return <QualityIndicator quality={quality} />;
}
