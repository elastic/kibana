/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHorizontalRule, EuiPanel, EuiText } from '@elastic/eui';

export const TitlePanel: React.FC = ({ children }) => (
  <>
    <EuiPanel hasShadow={false} paddingSize="s">
      <EuiText size="s" color="subdued">
        {children}
      </EuiText>
    </EuiPanel>
    <EuiHorizontalRule margin="none" />
  </>
);
