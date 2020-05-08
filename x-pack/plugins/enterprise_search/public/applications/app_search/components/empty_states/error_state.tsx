/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';

import { EuiButton } from '../../../shared/react_router_helpers';
import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const ErrorState: ReactFC<> = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <EuiPage restrictWidth className="empty-state">
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <EngineOverviewHeader />
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={<h2>Cannot connect to App Search</h2>}
            titleSize="l"
            body={
              <>
                <p>
                  We cannot connect to the App Search instance at the configured host URL:{' '}
                  <EuiCode>{enterpriseSearchUrl}</EuiCode>
                </p>
                <p>
                  Please ensure your App Search host URL is configured correctly within{' '}
                  <EuiCode>config/kibana.yml</EuiCode>.
                </p>
              </>
            }
            actions={
              <EuiButton iconType="help" fill to="/setup_guide">
                Review the setup guide
              </EuiButton>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
