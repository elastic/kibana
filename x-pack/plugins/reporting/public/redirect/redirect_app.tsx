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

import type { ScopedHistory } from 'src/core/public';

import { REPORTING_REDIRECT_LOCATOR_STORE_KEY } from '../../common/constants';
import { LocatorParams } from '../../common/types';

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
  consoleMessagePrefix: i18n.translate(
    'xpack.reporting.redirectApp.redirectConsoleErrorPrefixLabel',
    {
      defaultMessage: 'Redirect page error:',
    }
  ),
};

export const RedirectApp: FunctionComponent<Props> = ({ share }) => {
  const [error, setError] = useState<undefined | Error>();

  useEffect(() => {
    try {
      const locatorParams = ((window as unknown) as Record<string, LocatorParams>)[
        REPORTING_REDIRECT_LOCATOR_STORE_KEY
      ];

      if (!locatorParams) {
        throw new Error('Could not find locator for report');
      }

      share.navigate(locatorParams);
    } catch (e) {
      setError(e);
      // eslint-disable-next-line no-console
      console.error(i18nTexts.consoleMessagePrefix, e.message);
      throw e;
    }
  }, [share]);

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
