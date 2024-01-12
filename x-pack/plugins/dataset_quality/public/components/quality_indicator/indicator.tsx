/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import React, { ReactNode } from 'react';

export function QualityIndicator({
  quality,
  description,
}: {
  quality: 'good' | 'degraded' | 'poor';
  description: string | ReactNode;
}) {
  const qualityColors = {
    poor: 'danger',
    degraded: 'warning',
    good: 'success',
  };

  return <EuiHealth color={qualityColors[quality]}>{description}</EuiHealth>;
}
