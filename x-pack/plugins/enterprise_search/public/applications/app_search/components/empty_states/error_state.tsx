/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const ErrorState: React.FC = () => {
  return (
    <EuiPage restrictWidth>
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <EngineOverviewHeader isButtonDisabled />
        <EuiPageContent>
          <ErrorStatePrompt />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
