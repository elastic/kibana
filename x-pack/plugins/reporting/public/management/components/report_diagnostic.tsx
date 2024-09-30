/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import { DiagnoseResponse } from '@kbn/reporting-public/reporting_api_client';

interface Props {
  apiClient: ReportingAPIClient;
  clientConfig: ClientConfigType;
}

type ResultStatus = 'danger' | 'incomplete' | 'complete';

enum statuses {
  chromeStatus = 'chromeStatus',
  screenshotStatus = 'screenshotStatus',
}

interface State {
  isFlyoutVisible: boolean;
  chromeStatus: ResultStatus;
  help: string[];
  logs: string;
  isBusy: boolean;
  success: boolean;
}

const initialState: State = {
  [statuses.chromeStatus]: 'incomplete',
  isFlyoutVisible: false,
  help: [],
  logs: '',
  isBusy: false,
  success: true,
};

export const ReportDiagnostic = ({ apiClient, clientConfig }: Props) => {
  const [state, setStateBase] = useState(initialState);
  const setState = (s: Partial<typeof state>) =>
    setStateBase({
      ...state,
      ...s,
    });
  const { isBusy, chromeStatus, isFlyoutVisible } = state;
  const configAllowsImageReports =
    clientConfig.export_types.pdf.enabled || clientConfig.export_types.png.enabled;

  const closeFlyout = () => setState({ ...initialState, isFlyoutVisible: false });
  const showFlyout = () => setState({ isFlyoutVisible: true });
  const apiWrapper = (apiMethod: () => Promise<DiagnoseResponse>, statusProp: statuses) => () => {
    setState({ isBusy: true, [statusProp]: 'incomplete' });
    apiMethod()
      .then((response) => {
        setState({
          isBusy: false,
          help: response.help,
          logs: response.logs,
          success: response.success,
          [statusProp]: response.success ? 'complete' : 'danger',
        });
      })
      .catch((error) => {
        setState({
          isBusy: false,
          help: [
            i18n.translate('xpack.reporting.listing.diagnosticApiCallFailure', {
              defaultMessage: `There was a problem running the diagnostic: {error}`,
              values: { error },
            }),
          ],
          logs: `${error.message}`,
          success: false,
          [statusProp]: 'danger',
        });
      });
  };

  let flyout;
  if (isFlyoutVisible) {
    let outcomeCallout;

    if (state.success && chromeStatus === 'complete') {
      outcomeCallout = (
        <EuiCallOut
          id="xpack.reporting.listing.diagnosticSuccessMessage"
          color="success"
          title={i18n.translate('xpack.reporting.listing.diagnosticSuccessMessage', {
            defaultMessage: 'Everything looks good for screenshot reports to function.',
          })}
        />
      );
    } else if (!state.success && chromeStatus === 'complete') {
      outcomeCallout = (
        <EuiCallOut
          id="xpack.reporting.listing.diagnosticFailureTitle"
          iconType="warning"
          color="danger"
          title={i18n.translate('xpack.reporting.listing.diagnosticFailureTitle', {
            defaultMessage: "Something isn't working properly.",
          })}
        />
      );
    }

    flyout = (
      <EuiFlyout onClose={closeFlyout} aria-labelledby="reportingHelperTitle" size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.reporting.listing.diagnosticTitle"
                defaultMessage="Screenshotting Diagnostics"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.reporting.listing.diagnosticDescription"
              defaultMessage="Run diagnostics to automatically troubleshoot common reporting problems."
            />
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody banner={outcomeCallout}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.reporting.listing.diagnosticBrowserTitle"
                defaultMessage="Check browser"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.reporting.listing.diagnosticBrowserMessage"
              defaultMessage="Reporting uses a headless browser to generate PDF and PNGs. Validate that the browser can launch successfully."
            />
          </EuiText>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || chromeStatus === 'complete'}
            onClick={apiWrapper(() => apiClient.verifyBrowser(), statuses.chromeStatus)}
            isLoading={isBusy && chromeStatus === 'incomplete'}
            iconType={chromeStatus === 'complete' ? 'check' : undefined}
          >
            <FormattedMessage
              id="xpack.reporting.listing.diagnosticBrowserButton"
              defaultMessage="Check browser"
            />
          </EuiButton>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
  return (
    <div>
      {configAllowsImageReports && (
        <div>
          {flyout}
          <EuiButtonEmpty
            data-test-subj="screenshotDiagnosticLink"
            size="xs"
            flush="left"
            onClick={showFlyout}
          >
            <FormattedMessage
              id="xpack.reporting.listing.diagnosticButton"
              defaultMessage="Run screenshot diagnostics"
            />
          </EuiButtonEmpty>
        </div>
      )}
    </div>
  );
};
