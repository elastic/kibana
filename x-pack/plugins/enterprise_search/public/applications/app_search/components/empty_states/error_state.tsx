/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { EuiButton } from '../../../shared/react_router_helpers';

import { EngineOverviewHeader } from '../engine_overview_header';
import { IEmptyStatesProps } from './types';

import './empty_states.scss';

export const ErrorState: ReactFC<IEmptyStatesProps> = ({ appSearchUrl }) => {
  return (
    <EuiPage restrictWidth className="empty-state">
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
                  <EuiCode>{appSearchUrl}</EuiCode>
                </p>
                <p>
                  Please ensure your App Search host URL is configured correctly within{' '}
                  <EuiCode>config/kibana.yml</EuiCode>.
                </p>
              </>
            }
            actions={
              <EuiButton iconType="help" fill to="/app_search/setup_guide">
                Review the setup guide
              </EuiButton>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
