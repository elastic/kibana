/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { EngineOverviewHeader } from '../engine_overview_header';
import { IEmptyStatesProps } from './types';

import './empty_states.scss';

export const EmptyState: React.FC<IEmptyStatesProps> = ({ appSearchUrl }) => {
  return (
    <EuiPage restrictWidth className="empty-state">
      <EuiPageBody>
        <EngineOverviewHeader appSearchUrl={appSearchUrl} />
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
                href={`${appSearchUrl}/as/engines/new`}
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
