/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

export function LoadingTimelineItem() {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        backgroundColor: '#F1F4FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
      }}
    >
      <EuiLoadingSpinner size="s" />
    </div>
  );
}
