/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { FunctionComponent } from 'react';
import { matchPath } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';

import type { ScopedHistory } from 'src/core/public';

import { ReportingAPIClient } from '../lib/reporting_api_client';
import { REACT_ROUTER_REDIRECT_APP_PATH } from '../constants';

import type { SharePluginSetup } from '../shared_imports';

interface Props {
  apiClient: ReportingAPIClient;
  history: ScopedHistory;
  share: SharePluginSetup;
}

const i18nTexts = {
  redirectingTitle: i18n.translate('xpack.reporting.redirectApp.redirectingMessage', {
    defaultMessage: 'Redirecting...',
  }),
};

export const RedirectApp: FunctionComponent<Props> = ({ apiClient, history }) => {
  const match = useMemo(
    () =>
      matchPath<{ jobId: string; locatorIdx: string }>(history.location.pathname, {
        path: REACT_ROUTER_REDIRECT_APP_PATH,
        exact: true,
      }),
    [history]
  );

  if (!match) {
    throw new Error('boo');
  }

  const {
    params: { jobId, locatorIdx },
  } = match;

  useEffect(() => {
    async function fetchReportJob() {
      const job = await apiClient.getInfo(jobId);
      console.log(job);
    }
    fetchReportJob();
  });
  return (
    <EuiTitle>
      <h1>{i18nTexts.redirectingTitle}</h1>
    </EuiTitle>
  );
};
