/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CommonProps,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

import { euiStyled } from '../../../../../observability/public';

export const LogAnalysisSetupPage: React.FunctionComponent<CommonProps> = ({
  children,
  ...rest
}) => {
  return (
    <LogEntryRateSetupPage>
      <EuiPageBody>
        <LogEntryRateSetupPageContent
          verticalPosition="center"
          horizontalPosition="center"
          {...rest}
        >
          {children}
        </LogEntryRateSetupPageContent>
      </EuiPageBody>
    </LogEntryRateSetupPage>
  );
};

export const LogAnalysisSetupPageHeader: React.FunctionComponent = ({ children }) => (
  <EuiPageContentHeader>
    <EuiPageContentHeaderSection>
      <EuiTitle size="m">
        <h3>{children}</h3>
      </EuiTitle>
    </EuiPageContentHeaderSection>
  </EuiPageContentHeader>
);

export const LogAnalysisSetupPageContent = EuiPageContentBody;

// !important due to https://github.com/elastic/eui/issues/2232
const LogEntryRateSetupPageContent = euiStyled(EuiPageContent)`
  max-width: 768px !important;
`;

const LogEntryRateSetupPage = euiStyled(EuiPage)`
  height: 100%;
`;
