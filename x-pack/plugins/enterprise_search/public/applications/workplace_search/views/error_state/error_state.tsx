/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { ViewContentHeader } from '../../components/shared/view_content_header';

export const ErrorState: React.FC = () => {
  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="error" metric="cannot_connect" />

      <KibanaPageTemplate isEmptyState>
        <ViewContentHeader title={WORKPLACE_SEARCH_PLUGIN.NAME} />
        <ErrorStatePrompt />
      </KibanaPageTemplate>
    </>
  );
};
