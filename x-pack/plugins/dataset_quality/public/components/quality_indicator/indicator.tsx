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

  const color =
    quality === 'poor'
      ? euiTheme.colors.dangerText
      : quality === 'degraded'
      ? euiTheme.colors.warningText
      : euiTheme.colors.successText;

  return <EuiIcon type="dot" color={color} />;
}
