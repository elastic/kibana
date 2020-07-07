/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface Props {
  apiClient: ReportingAPIClient;
}

type status = 'danger' | 'incomplete' | 'complete';

interface State {
  isFlyoutVisible: boolean;
  configStatus: status;
  chromeStatus: status;
  screenshotStatus: status;
  error: string;
  isBusy: boolean;
}

const diceRoll = () => {
  return Math.floor(Math.random() * Math.floor(10)) <= 7;
};

const initialState: State = {
  isFlyoutVisible: false,
  configStatus: 'incomplete',
  chromeStatus: 'incomplete',
  screenshotStatus: 'incomplete',
  error: '',
  isBusy: false,
};

export const ReportHelper = ({ apiClient }: Props) => {
  const [state, setStateBase] = useState(initialState);
  const { configStatus, isBusy, screenshotStatus, chromeStatus, error, isFlyoutVisible } = state;
  const setState = (s: Partial<typeof state>) =>
    setStateBase({
      ...state,
      ...s,
    });

  const closeFlyout = () => setState({ ...initialState, isFlyoutVisible: false });
  const showFlyout = () => setState({ isFlyoutVisible: true });
  const sleepRun = (fn: any) => () => {
    setState({ isBusy: true });
    setTimeout(() => {
      const isGood = diceRoll();
      setState({ isBusy: false });

      if (isGood) {
        setState({ error: '' });
        return fn();
      }
      setState({ error: 'Unable to load configuration properly for user...' });
    }, 1500);
  };

  const steps = [
    {
      title: 'Verify Kibana Configuration',
      children: (
        <Fragment>
          <p>This ensure your Kibana configuration is setup properly for reports</p>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || configStatus === 'complete'}
            isLoading={isBusy && configStatus === 'incomplete'}
            onClick={sleepRun(() => setState({ configStatus: 'complete' }))}
            iconType={configStatus === 'complete' ? 'check' : undefined}
          >
            Verify Configuration
          </EuiButton>
        </Fragment>
      ),
      status: error && configStatus !== 'complete' ? 'danger' : configStatus,
    },
  ];

  if (configStatus === 'complete') {
    steps.push({
      title: 'Check Chromium',
      children: (
        <Fragment>
          <p>This validates that the chromium binary can run properly</p>
          <EuiSpacer />
          <EuiButton
            disabled={isBusy || chromeStatus === 'complete'}
            onClick={sleepRun(() => setState({ chromeStatus: 'complete' }))}
            isLoading={isBusy && chromeStatus === 'incomplete'}
            iconType={chromeStatus === 'complete' ? 'check' : undefined}
          >
            Check Chromium
          </EuiButton>
        </Fragment>
      ),
      status: error && chromeStatus !== 'complete' ? 'danger' : chromeStatus,
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
            onClick={sleepRun(() => setState({ screenshotStatus: 'complete' }))}
            isLoading={isBusy && screenshotStatus === 'incomplete'}
            iconType={screenshotStatus === 'complete' ? 'check' : undefined}
          >
            Capture Screen
          </EuiButton>
        </Fragment>
      ),
      status: error && screenshotStatus !== 'complete' ? 'danger' : screenshotStatus,
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
      status: error ? 'danger' : screenshotStatus,
    });
  }

  if (error) {
    steps.push({
      title: "Whoops! Looks like something isn't working properly.",
      children: (
        <EuiCallOut color="danger" iconType="alert">
          <p>{error}</p>
        </EuiCallOut>
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
      <EuiButton iconType="help" onClick={showFlyout}>
        <FormattedMessage
          id="xpack.reporting.listing.helpButtonText"
          defaultMessage="Check Reporting"
        />
      </EuiButton>
    </div>
  );
};
