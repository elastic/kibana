/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent } from '@elastic/eui';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const ErrorState: React.FC = () => {
  return (
    <>
      <SetPageChrome isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EngineOverviewHeader />
      <EuiPageContent>
        <ErrorStatePrompt />
      </EuiPageContent>
    </>
  );
};
