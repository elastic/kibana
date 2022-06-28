/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiText,
} from '@elastic/eui';
import React, { FC } from 'react';

interface LayoutProps {
  pageTitle?: string;
}

const ROOT_HEADER = 'Threat intelligence';

export const displayName = 'DefaultPageLayout';

export const DefaultPageLayout: FC<LayoutProps> = ({ children, pageTitle }) => (
  <EuiPageBody>
    <EuiPageContent>
      <EuiPageHeader pageTitle={ROOT_HEADER}>
        Elastic threat intelligence help you see if you are open to or have been subject to current
        or historical known threats
      </EuiPageHeader>
      <EuiHorizontalRule />

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
