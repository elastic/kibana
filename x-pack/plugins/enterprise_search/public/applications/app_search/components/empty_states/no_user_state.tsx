/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';

import { IEmptyStatesProps } from './types';
import { EngineOverviewHeader } from '../engine_overview_header';
import { getUserName } from '../../utils/get_username';

import './empty_states.scss';

export const NoUserState: React.FC<IEmptyStatesProps> = ({ appSearchUrl }) => {
  const username = getUserName();

  return (
    <EuiPage restrictWidth className="empty-state">
      <EuiPageBody>
        <EngineOverviewHeader appSearchUrl={appSearchUrl} />
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="lock"
            title={<h2>Cannot find App Search account</h2>}
            titleSize="l"
            body={
              <>
                <p>
                  We cannot find an App Search account matching your username
                  {username && (
                    <>
                      : <EuiCode>{username}</EuiCode>
                    </>
                  )}
                  .
                </p>
                <p>
                  Please contact your App Search administrator to request an invite for that user.
                </p>
              </>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
