/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiPanel } from '@elastic/eui';

export const OnboardingCardContentWrapper = React.memo<PropsWithChildren<{}>>(({ children }) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="m">
      {children}
    </EuiPanel>
  );
});
OnboardingCardContentWrapper.displayName = 'OnboardingCardContentWrapper';
