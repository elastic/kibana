/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDelayHide, EuiPortal, EuiProgress } from '@elastic/eui';
import React from 'react';

interface Props {
  isLoading: boolean;
}

export function GlobalProgressView({ isLoading }: Props) {
  return (
    <EuiDelayHide
      hide={!isLoading}
      minimumDuration={1000}
      render={() => (
        <EuiPortal>
          <EuiProgress size="xs" position="fixed" />
        </EuiPortal>
      )}
    />
  );
}
