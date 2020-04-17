/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer, EuiLoadingContent } from '@elastic/eui';

import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { IAppSearchProps } from '../../index';

import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const LoadingState: React.FC<IAppSearchProps> = ({ appSearchUrl, setBreadcrumbs }) => {
  return (
    <EuiPage restrictWidth className="engine-overview empty-state">
      <SetBreadcrumbs setBreadcrumbs={setBreadcrumbs} isRoot />

      <EuiPageBody>
        <EngineOverviewHeader appSearchUrl={appSearchUrl} />
        <EuiPageContent>
          <EuiLoadingContent lines={5} />
          <EuiSpacer size="xxl" />
          <EuiLoadingContent lines={4} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
