/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiCallOut, EuiCodeBlock } from '@elastic/eui';
import qs from 'query-string';

import type { ScopedHistory } from 'src/core/public';

import { ReportingAPIClient } from '../lib/reporting_api_client';
import type { SharePluginSetup } from '../shared_imports';

interface Props {
  apiClient: ReportingAPIClient;
  history: ScopedHistory;
  share: SharePluginSetup;
}

const i18nTexts = {
  errorTitle: i18n.translate('xpack.reporting.redirectApp.errorTitle', {
    defaultMessage: 'Redirect error',
  }),
  redirectingTitle: i18n.translate('xpack.reporting.redirectApp.redirectingMessage', {
    defaultMessage: 'Redirecting...',
  }),
};

export const RedirectApp: FunctionComponent<Props> = ({ apiClient, history, share }) => {
  const [error, setError] = useState<undefined | Error>();
  const search = history.location.search;

  useEffect(() => {
    async function fetchReportJob() {
      const { jobId, locatorOffset } = qs.parse(search);

      try {
        if (!jobId || !locatorOffset || Array.isArray(jobId) || Array.isArray(locatorOffset)) {
          throw new Error(
            `Unexpected redirect parameters, received: (1) report id: "${jobId}" (expected id) and (2) locator offset: "${locatorOffset}.`
          );
        }
        const locatorParams = await apiClient.getLocatorParams(jobId);

        if (!locatorParams || locatorParams.length === 0) {
          throw new Error(`No locators for report ID ${jobId}`);
        }

        const { [parseInt(locatorOffset, 10)]: locatorParam } = locatorParams;

        if (!locatorParam) {
          throw new Error(`No locator params found at ${locatorOffset} for report ID ${jobId}`);
        }

        share.navigate(locatorParam);
      } catch (e) {
        setError(e);
        throw e;
      }
    }
    fetchReportJob();
  }, [apiClient, search, share]);
  return error ? (
    <EuiCallOut title={i18nTexts.errorTitle} color="danger">
      <p>{error.message}</p>
      {error.stack && <EuiCodeBlock>{error.stack}</EuiCodeBlock>}
    </EuiCallOut>
  ) : (
    <EuiTitle>
      <h1>{i18nTexts.redirectingTitle}</h1>
    </EuiTitle>
  );
};
