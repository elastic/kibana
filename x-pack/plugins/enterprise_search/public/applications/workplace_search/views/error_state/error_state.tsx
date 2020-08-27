/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove EuiPage & EuiPageBody before exposing full app

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { ViewContentHeader } from '../../components/shared/view_content_header';

export const ErrorState: React.FC = () => {
  return (
    <EuiPage restrictWidth>
      <SetPageChrome isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <ViewContentHeader title={WORKPLACE_SEARCH_PLUGIN.NAME} />
        <EuiPageContent>
          <ErrorStatePrompt />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
