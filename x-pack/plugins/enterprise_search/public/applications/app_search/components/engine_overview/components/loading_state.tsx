/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiSpacer, EuiLoadingContent } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { EngineOverviewHeader } from './header';

export const LoadingState: React.FC = () => {
  return (
    <>
      <SetPageChrome isRoot />
      <EngineOverviewHeader />
      <EuiPageContent paddingSize="l">
        <EuiLoadingContent lines={5} />
        <EuiSpacer size="xxl" />
        <EuiLoadingContent lines={4} />
      </EuiPageContent>
    </>
  );
};
