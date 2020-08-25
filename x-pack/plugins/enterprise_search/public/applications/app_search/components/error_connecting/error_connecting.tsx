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

export const ErrorConnecting: React.FC = () => {
  return (
    <>
      <SetPageChrome isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageContent>
        <ErrorStatePrompt />
      </EuiPageContent>
    </>
  );
};
