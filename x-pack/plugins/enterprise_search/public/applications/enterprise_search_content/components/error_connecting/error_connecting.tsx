/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '../../../../../../../../src/plugins/kibana_react/public';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetEnterpriseSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

export const ErrorConnecting: React.FC = () => {
  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="error" metric="cannot_connect" />

      <KibanaPageTemplate isEmptyState>
        <ErrorStatePrompt />
      </KibanaPageTemplate>
    </>
  );
};
