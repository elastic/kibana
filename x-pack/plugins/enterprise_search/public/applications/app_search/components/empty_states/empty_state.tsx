/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { KibanaContext, IKibanaContext } from '../../../index';

import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const EmptyState: React.FC<> = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <EuiPage restrictWidth className="empty-state">
      <SetBreadcrumbs isRoot />

      <EuiPageBody>
        <EngineOverviewHeader />
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="eyeClosed"
            title={<h2>There’s nothing here yet</h2>}
            titleSize="l"
            body={
              <p>
                Looks like you don’t have any App Search engines.
                <br /> Let’s create your first one now.
              </p>
            }
            actions={
              <EuiButton
                iconType="popout"
                fill
                href={`${enterpriseSearchUrl}/as/engines/new`}
                target="_blank"
              >
                Create your first Engine
              </EuiButton>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
