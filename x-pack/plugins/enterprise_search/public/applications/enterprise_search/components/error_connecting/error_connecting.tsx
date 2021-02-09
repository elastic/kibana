/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPage, EuiPageContent } from '@elastic/eui';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

export const ErrorConnecting: React.FC = () => (
  <EuiPage restrictWidth>
    <SendTelemetry action="error" metric="cannot_connect" />
    <EuiPageContent>
      <ErrorStatePrompt />
    </EuiPageContent>
  </EuiPage>
);
