/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiTitle,
} from '@elastic/eui';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { ENGINE_API_LOGS_PATH } from '../../../routes';
import { generateEnginePath } from '../../engine';

import { RECENT_API_EVENTS } from '../../api_logs/constants';
import { VIEW_API_LOGS } from '../constants';

export const RecentApiLogs: React.FC = () => {
  return (
    <EuiPageContent>
      <EuiPageContentHeader responsive={false}>
        <EuiPageContentHeaderSection>
          <EuiTitle size="xs">
            <h2>{RECENT_API_EVENTS}</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
        <EuiPageContentHeaderSection>
          <EuiButtonTo to={generateEnginePath(ENGINE_API_LOGS_PATH)} size="s">
            {VIEW_API_LOGS}
          </EuiButtonTo>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        TODO: API Logs Table
        {/* <ApiLogsTable hidePagination={true} /> */}
      </EuiPageContentBody>
    </EuiPageContent>
  );
};
