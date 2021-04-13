/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageContent, EuiSpacer, EuiLoadingContent } from '@elastic/eui';

import { EnginesOverviewHeader } from './header';

export const LoadingState: React.FC = () => {
  return (
    <>
      <EnginesOverviewHeader />
      <EuiPageContent hasBorder paddingSize="l">
        <EuiLoadingContent lines={5} />
        <EuiSpacer size="xxl" />
        <EuiLoadingContent lines={4} />
      </EuiPageContent>
    </>
  );
};
