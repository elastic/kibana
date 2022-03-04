/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ReportingAPIClient, DiagnoseResponse } from '../../lib/reporting_api_client';

interface Props {
  apiClient: ReportingAPIClient;
}

type ResultStatus = 'danger' | 'incomplete' | 'complete';

enum statuses {
  chromeStatus = 'chromeStatus',
  screenshotStatus = 'screenshotStatus',
}

interface State {
  isFlyoutVisible: boolean;
  chromeStatus: ResultStatus;
  screenshotStatus: ResultStatus;
  help: string[];
  logs: string;
  isBusy: boolean;
  success: boolean;
}

const initialState: State = {
  [statuses.chromeStatus]: 'incomplete',
  [statuses.screenshotStatus]: 'incomplete',
  isFlyoutVisible: false,
  help: [],
  logs: '',
  isBusy: false,
  success: true,
};

export const ReportDiagnostic = ({ apiClient }: Props) => {
  const [state, setStateBase] = useState(initialState);
  const setState = (s: Partial<typeof state>) =>
    setStateBase({
      ...state,
      ...s,
    });
  const { isBusy, screenshotStatus, chromeStatus, isFlyoutVisible, help, logs, success } = state;

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

  const steps = [
    {
      title: i18n.translate('xpack.reporting.listing.diagnosticBrowserTitle', {
        defaultMessage: 'Check browser',
      }),
      children: (
        <Fragment>
          <FormattedMessage
            id="xpack.reporting.listing.diagnosticBrowserMessage"
            defaultMessage="Reporting uses a headless browser to generate PDF and PNGs. Validate that the browser can launch successfully."
          />
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
        </Fragment>
      ),
      status: !success && chromeStatus !== 'complete' ? 'danger' : chromeStatus,
    },
  ];

  if (chromeStatus === 'complete') {
    steps.push({
      title: i18n.translate('xpack.reporting.listing.diagnosticScreenshotTitle', {
        defaultMessage: 'Check screen capture',
      }),
      children: (
        <Fragment>
          <FormattedMessage
            id="xpack.reporting.listing.diagnosticScreenshotMessage"
            defaultMessage="Ensure that the headless browser can capture a screenshot of a page."
          />
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || screenshotStatus === 'complete'}
            onClick={apiWrapper(() => apiClient.verifyScreenCapture(), statuses.screenshotStatus)}
            isLoading={isBusy && screenshotStatus === 'incomplete'}
            iconType={screenshotStatus === 'complete' ? 'check' : undefined}
          >
            <FormattedMessage
              id="xpack.reporting.listing.diagnosticScreenshotButton"
              defaultMessage="Capture screenshot"
            />
          </EuiButton>
        </Fragment>
      ),
      status: !success && screenshotStatus !== 'complete' ? 'danger' : screenshotStatus,
    });
  }

  if (screenshotStatus === 'complete') {
    steps.push({
      title: i18n.translate('xpack.reporting.listing.diagnosticSuccessTitle', {
        defaultMessage: 'All set!',
      }),
      children: (
        <Fragment>
          <FormattedMessage
            id="xpack.reporting.listing.diagnosticSuccessMessage"
            defaultMessage="Everything looks good for reporting to function."
          />
        </Fragment>
      ),
      status: !success ? 'danger' : screenshotStatus,
    });
  }

  if (!success) {
    steps.push({
      title: i18n.translate('xpack.reporting.listing.diagnosticFailureTitle', {
        defaultMessage: "Something isn't working properly.",
      }),
      children: (
        <Fragment>
          {help.length ? (
            <Fragment>
              <EuiCallOut color="danger" iconType="alert">
                <p>{help.join('\n')}</p>
              </EuiCallOut>
            </Fragment>
          ) : null}
          {logs.length ? (
            <Fragment>
              <EuiSpacer />
              <FormattedMessage
                id="xpack.reporting.listing.diagnosticFailureDescription"
                defaultMessage="Here are some details about the issue:"
              />
              <EuiSpacer />
              <EuiCodeBlock>{logs}</EuiCodeBlock>
            </Fragment>
          ) : null}
        </Fragment>
      ),
      status: 'danger',
    });
  }

  let flyout;
  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout onClose={closeFlyout} aria-labelledby="reportingHelperTitle" size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.reporting.listing.diagnosticTitle"
                defaultMessage="Reporting Diagnostics"
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
        <EuiFlyoutBody>
          <EuiSteps steps={steps} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
  return (
    <div>
      {flyout}
      <EuiButtonEmpty size="xs" flush="left" onClick={showFlyout}>
        <FormattedMessage
          id="xpack.reporting.listing.diagnosticButton"
          defaultMessage="Run reporting diagnostics"
        />
      </EuiButtonEmpty>
    </div>
  );
};
