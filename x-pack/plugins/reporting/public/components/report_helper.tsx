/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { ReportingAPIClient, DiagnoseResponse } from '../lib/reporting_api_client';

interface Props {
  apiClient: ReportingAPIClient;
}

type ResultStatus = 'danger' | 'incomplete' | 'complete';

enum statuses {
  configStatus = 'configStatus',
  chromeStatus = 'chromeStatus',
  screenshotStatus = 'screenshotStatus',
}

interface State {
  isFlyoutVisible: boolean;
  configStatus: ResultStatus;
  chromeStatus: ResultStatus;
  screenshotStatus: ResultStatus;
  help: string[];
  logs: string;
  isBusy: boolean;
  success: boolean;
}

const initialState: State = {
  [statuses.configStatus]: 'incomplete',
  [statuses.chromeStatus]: 'incomplete',
  [statuses.screenshotStatus]: 'incomplete',
  isFlyoutVisible: false,
  help: [],
  logs: '',
  isBusy: false,
  success: true,
};

export const ReportHelper = ({ apiClient }: Props) => {
  const [state, setStateBase] = useState(initialState);
  const setState = (s: Partial<typeof state>) =>
    setStateBase({
      ...state,
      ...s,
    });
  const {
    configStatus,
    isBusy,
    screenshotStatus,
    chromeStatus,
    isFlyoutVisible,
    help,
    logs,
    success,
  } = state;

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
          help: [`There was a problem running the diagnostic: ${error}`],
          logs: `${error.message}\n${error.stack}`,
          success: false,
          [statusProp]: 'danger',
        });
      });
  };

  const steps = [
    {
      title: 'Verify Kibana Configuration',
      children: (
        <Fragment>
          <p>This ensures your Kibana configuration is setup properly for reports</p>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || configStatus === 'complete'}
            isLoading={isBusy && configStatus === 'incomplete'}
            onClick={apiWrapper(apiClient.verifyConfig, statuses.configStatus)}
            iconType={configStatus === 'complete' ? 'check' : undefined}
          >
            Verify Configuration
          </EuiButton>
        </Fragment>
      ),
      status: !success && configStatus !== 'complete' ? 'danger' : configStatus,
    },
  ];

  if (configStatus === 'complete') {
    steps.push({
      title: 'Check Browser',
      children: (
        <Fragment>
          <p>
            Reporting utilizes a headless browser to generate PDF and PNGS, this check validates
            that the browser binary can run properly
          </p>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || chromeStatus === 'complete'}
            onClick={apiWrapper(apiClient.verifyBrowser, statuses.chromeStatus)}
            isLoading={isBusy && chromeStatus === 'incomplete'}
            iconType={chromeStatus === 'complete' ? 'check' : undefined}
          >
            Check Browser
          </EuiButton>
        </Fragment>
      ),
      status: !success && chromeStatus !== 'complete' ? 'danger' : chromeStatus,
    });
  }

  if (chromeStatus === 'complete') {
    steps.push({
      title: 'Check Screen Capture Capabilities',
      children: (
        <Fragment>
          <p>The final step checks if we can properly capture Kibana screens.</p>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || screenshotStatus === 'complete'}
            onClick={apiWrapper(apiClient.verifyScreenCapture, statuses.screenshotStatus)}
            isLoading={isBusy && screenshotStatus === 'incomplete'}
            iconType={screenshotStatus === 'complete' ? 'check' : undefined}
          >
            Capture Screen
          </EuiButton>
        </Fragment>
      ),
      status: !success && screenshotStatus !== 'complete' ? 'danger' : screenshotStatus,
    });
  }

  if (screenshotStatus === 'complete') {
    steps.push({
      title: 'All set!',
      children: (
        <Fragment>
          <p>Excellent! Everything looks like shipshape for reporting to function!</p>
        </Fragment>
      ),
      status: !success ? 'danger' : screenshotStatus,
    });
  }

  if (!success) {
    steps.push({
      title: "Whoops! Looks like something isn't working properly.",
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
              <p>Here are some more details about the issue:</p>
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
            <h2>Report Helper</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <p>
              Automatically run a series of diagnostics to troubleshoot common reporting problems.
            </p>
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
          id="xpack.reporting.listing.helpButtonText"
          defaultMessage="Check Reporting"
        />
      </EuiButtonEmpty>
    </div>
  );
};
