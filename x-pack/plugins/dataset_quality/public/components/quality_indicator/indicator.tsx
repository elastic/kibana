/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';

export function QualityIndicator({ quality }: { quality: 'good' | 'degraded' | 'poor' }) {
  const { euiTheme } = useEuiTheme();

  const qualityColors = {
    poor: euiTheme.colors.dangerText,
    degraded: euiTheme.colors.warningText,
    good: euiTheme.colors.successText,
  };

  return <EuiIcon type="dot" color={qualityColors[quality]} />;
}
