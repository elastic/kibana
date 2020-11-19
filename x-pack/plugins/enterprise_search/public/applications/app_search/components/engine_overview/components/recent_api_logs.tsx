/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiTitle,
} from '@elastic/eui';

import { EuiButton } from '../../../../shared/react_router_helpers';

import { ENGINE_API_LOGS_PATH, getEngineRoute } from '../../../routes';
import { RECENT_API_EVENTS } from '../../api_logs/constants';
import { VIEW_API_LOGS } from '../constants';

import { EngineLogic } from '../../engine';

export const RecentApiLogs: React.FC = () => {
  const { engineName } = useValues(EngineLogic);
  const engineRoute = getEngineRoute(engineName);

  return (
    <EuiPageContent>
      <EuiPageContentHeader responsive={false}>
        <EuiPageContentHeaderSection>
          <EuiTitle size="xs">
            <h2>{RECENT_API_EVENTS}</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
        <EuiPageContentHeaderSection>
          <EuiButton to={engineRoute + ENGINE_API_LOGS_PATH} size="s">
            {VIEW_API_LOGS}
          </EuiButton>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        TODO: API Logs Table
        {/* <ApiLogsTable hidePagination={true} /> */}
      </EuiPageContentBody>
    </EuiPageContent>
  );
};
