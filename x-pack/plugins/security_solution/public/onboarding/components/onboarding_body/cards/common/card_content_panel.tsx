/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

export const OnboardingCardContentPanel = React.memo<PropsWithChildren<{}>>(({ children }) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="m">
      {children}
    </EuiPanel>
  );
});
OnboardingCardContentPanel.displayName = 'OnboardingCardContentPanel';

export const OnboardingCardContentImagePanel = React.memo<
  PropsWithChildren<{ imageSrc: string; imageAlt: string }>
>(({ children, imageSrc, imageAlt }) => {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m">
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem>
          <img src={imageSrc} alt={imageAlt} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
OnboardingCardContentImagePanel.displayName = 'OnboardingCardContentImagePanel';
