/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageHeader, EuiPageHeaderSection, EuiTitle, EuiButton } from '@elastic/eui';

interface IEngineOverviewHeader {
  appSearchUrl?: string;
}

export const EngineOverviewHeader: React.FC<IEngineOverviewHeader> = ({ appSearchUrl }) => {
  const buttonProps = {
    fill: true,
    iconType: 'popout',
  };
  if (appSearchUrl) {
    buttonProps.href = `${appSearchUrl}/as`;
    buttonProps.target = '_blank';
  } else {
    buttonProps.isDisabled = true;
  }

  return (
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Engine Overview</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
      <EuiPageHeaderSection>
        <EuiButton {...buttonProps}>Launch App Search</EuiButton>
      </EuiPageHeaderSection>
    </EuiPageHeader>
  );
};
