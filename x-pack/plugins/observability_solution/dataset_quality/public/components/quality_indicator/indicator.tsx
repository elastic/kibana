/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, EuiText } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { QualityIndicators, InfoIndicators } from '../../../common/types';

export function QualityIndicator({
  quality,
  description,
  isColoredDescription,
}: {
  quality: QualityIndicators;
  description: string | ReactNode;
  isColoredDescription?: boolean;
}) {
  const qualityColors: Record<QualityIndicators, InfoIndicators> = {
    poor: 'danger',
    degraded: 'warning',
    good: 'success',
  };

  return (
    <EuiHealth color={qualityColors[quality]}>
      <EuiText size="s" color={isColoredDescription ? qualityColors[quality] : 'white'}>
        {description}
      </EuiText>
    </EuiHealth>
  );
}
