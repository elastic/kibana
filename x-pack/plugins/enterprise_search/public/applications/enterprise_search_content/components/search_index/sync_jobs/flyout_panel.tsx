/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

interface FlyoutPanelProps {
  title: string;
}

export const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ children, title }) => {
  return (
    <EuiPanel paddingSize="l" color="subdued" hasShadow={false}>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer />
      {children}
    </EuiPanel>
  );
};
