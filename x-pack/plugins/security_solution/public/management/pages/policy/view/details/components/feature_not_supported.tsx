/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';

export const FeatureNotSupported = memo(() => {
  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none">
      <EuiEmptyPrompt
        iconType="iInCircle"
        body={<p>{'Currently not available for this platform'}</p>}
      />
    </EuiPanel>
  );
});
FeatureNotSupported.displayName = 'FeatureNotSupported';
