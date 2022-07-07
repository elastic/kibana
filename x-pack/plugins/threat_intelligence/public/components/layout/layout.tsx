/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageBody,
  EuiPageContent,
  EuiText,
} from '@elastic/eui';
import React, { FC } from 'react';

interface LayoutProps {
  pageTitle?: string;
}

export const displayName = 'DefaultPageLayout';

export const DefaultPageLayout: FC<LayoutProps> = ({ children, pageTitle }) => (
  <EuiPageBody>
    <EuiPageContent>
      {pageTitle && (
        <EuiText>
          <h2 data-testid={`${displayName}-subheader`}>{pageTitle}</h2>
        </EuiText>
      )}

      {children}
    </EuiPageContent>
  </EuiPageBody>
);

DefaultPageLayout.displayName = displayName;
