/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, IconColor } from '@elastic/eui';
import React from 'react';

// TODO: Ask design about other color maps
// TODO: Ask design if we should use this component everywhere we display the severity. If yes, move this to <FormattedFieldValue />.
const SEVERITY_COLOR_MAP: Record<string, IconColor> = {
  low: 'subdued',
};

export const OverviewSeverity = React.memo<{ severity: string }>(({ severity }) => {
  const color: IconColor = SEVERITY_COLOR_MAP[severity] ?? 'default';
  return <EuiHealth color={color}>{severity}</EuiHealth>;
});

OverviewSeverity.displayName = 'OverviewSeverity';
