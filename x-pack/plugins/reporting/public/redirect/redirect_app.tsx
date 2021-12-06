/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { FunctionComponent } from 'react';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiCodeBlock } from '@elastic/eui';

import type { ScopedHistory } from 'src/core/public';
import type { ScreenshottingSetup } from '../../../screenshotting/public';

import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../common/constants';
import { LocatorParams } from '../../common/types';

import { ReportingAPIClient } from '../lib/reporting_api_client';
import type { SharePluginSetup } from '../shared_imports';

import './redirect_app.scss';

interface Props {
  apiClient: ReportingAPIClient;
  history: ScopedHistory;
  screenshotting: ScreenshottingSetup;
  share: SharePluginSetup;
}

const i18nTexts = {
  errorTitle: i18n.translate('xpack.reporting.redirectApp.errorTitle', {
    defaultMessage: 'Redirect error',
  }),
  consoleMessagePrefix: i18n.translate(
    'xpack.reporting.redirectApp.redirectConsoleErrorPrefixLabel',
    {
      defaultMessage: 'Redirect page error:',
    }
  ),
};

type ReportingContext = Record<string, LocatorParams>;

export const RedirectApp: FunctionComponent<Props> = ({ apiClient, screenshotting, share }) => {
  const [error, setError] = useState<undefined | Error>();

  useEffect(() => {
    (async () => {
      try {
        let locatorParams: undefined | LocatorParams;

        const { jobId } = parse(window.location.search);

        if (jobId) {
          const result = await apiClient.getInfo(jobId as string);
          locatorParams = result?.locatorParams?.[0];
        } else {
          locatorParams =
            screenshotting.getContext<ReportingContext>()?.[REPORTING_REDIRECT_LOCATOR_STORE_KEY];
        }

        if (!locatorParams) {
          throw new Error('Could not find locator params for report');
        }

        share.navigate(locatorParams);
      } catch (e) {
        setError(e);
        // eslint-disable-next-line no-console
        console.error(i18nTexts.consoleMessagePrefix, e.message);
        throw e;
      }
    })();
  }, [apiClient, screenshotting, share]);

  return (
    <div className="reportingRedirectApp__interstitialPage">
      {error ? (
        <EuiCallOut title={i18nTexts.errorTitle} color="danger">
          <p>{error.message}</p>
          {error.stack && <EuiCodeBlock>{error.stack}</EuiCodeBlock>}
        </EuiCallOut>
      ) : (
        // We don't show anything on this page, the share service will handle showing any issues with
        // using the locator
        <div />
      )}
    </div>
  );
};
