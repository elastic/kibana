/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiSpacer, EuiLoadingContent } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const LoadingState: React.FC = () => {
  return (
    <>
      <SetPageChrome isRoot />
      <EngineOverviewHeader />
      <EuiPageContent className="emptyState">
        <EuiLoadingContent lines={5} />
        <EuiSpacer size="xxl" />
        <EuiLoadingContent lines={4} />
      </EuiPageContent>
    </>
  );
};
