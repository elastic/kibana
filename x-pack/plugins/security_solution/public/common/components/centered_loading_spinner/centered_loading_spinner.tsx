/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, type EuiLoadingSpinnerProps } from '@elastic/eui';

const centerSpinnerStyle = { display: 'flex', margin: 'auto', marginTop: '10em' };

export const CenteredLoadingSpinner = React.memo<EuiLoadingSpinnerProps>(
  (euiLoadingSpinnerProps) => {
    return <EuiLoadingSpinner {...euiLoadingSpinnerProps} style={centerSpinnerStyle} />;
  }
);
CenteredLoadingSpinner.displayName = 'CenteredLoadingSpinner';
