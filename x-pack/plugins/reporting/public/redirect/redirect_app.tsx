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

export const RedirectApp: FunctionComponent<Props> = ({ apiClient, history, share }) => {
  const pathname = history.location.pathname;
  const match = useMemo(
    () =>
      matchPath<{ jobId: string; locatorIdx: string }>(pathname, {
        path: REACT_ROUTER_REDIRECT_APP_PATH,
        exact: true,
      }),
    [pathname]
  );

  if (!match) {
    throw new Error(`Unexpected redirect parameters, received: ${pathname}`);
  }

  const {
    params: { jobId, locatorIdx },
  } = match;

  useEffect(() => {
    async function fetchReportJob() {
      const {
        payload: { locators },
      } = await apiClient.getInfo(jobId);

      if (locators) {
        const { [parseInt(locatorIdx, 10)]: locatorParams } = locators;
        if (locatorParams) {
          share.navigate(locatorParams);
          return;
        }
        throw new Error(`No locator params found at ${locatorIdx} for job ID ${jobId}`);
      }
      throw new Error(`No locators for this report job for job ID ${jobId}`);
    }
    fetchReportJob();
  });
  return (
    <EuiTitle>
      <h1>{i18nTexts.redirectingTitle}</h1>
    </EuiTitle>
  );
};
