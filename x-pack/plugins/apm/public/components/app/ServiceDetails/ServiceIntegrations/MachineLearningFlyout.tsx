/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
// @ts-ignore
import {
  getMlJob,
  startMlJob
} from 'x-pack/plugins/apm/public/services/rest/ml';
// @ts-ignore
import { getAPMIndexPattern } from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { KibanaLink, ViewMLJob } from 'x-pack/plugins/apm/public/utils/url';

interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  transactionType?: string;
  location: any;
}

interface FlyoutState {
  isLoading: boolean;
  hasMlJob: boolean;
  hasIndexPattern: boolean | null;
}

export class MachineLearningFlyout extends Component<FlyoutProps, FlyoutState> {
  public state = {
    isLoading: false,
    hasIndexPattern: null,
    hasMlJob: false
  };

  public componentDidMount() {
    getAPMIndexPattern().then((indexPattern: string | null) => {
      this.setState({ hasIndexPattern: indexPattern != null });
    });
    this.checkForMlJob();
  }

  public componentDidUpdate(prevProps: FlyoutProps) {
    if (
      prevProps.serviceName !== this.props.serviceName ||
      prevProps.transactionType !== this.props.transactionType
    ) {
      this.checkForMlJob();
    }
  }

  public async checkForMlJob() {
    const { serviceName, transactionType } = this.props;
    const { count } = await getMlJob({
      serviceName,
      transactionType
    });
    this.setState({ hasMlJob: count > 0 });
  }

  public createJob = async () => {
    this.setState({ isLoading: true });
    try {
      const { serviceName, transactionType } = this.props;
      if (serviceName) {
        const res = await startMlJob({ serviceName, transactionType });
        const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
        if (!didSucceed) {
          throw new Error('Creating ML job failed');
        }
        this.addSuccessToast();
      }
    } catch (e) {
      this.addErrorToast();
    }

    this.setState({ isLoading: false });
    this.props.onClose();
  };

  public addErrorToast = () => {
    const {
      serviceName,
      transactionType = 'all transactions',
      location
    } = this.props;
    toastNotifications.addWarning({
      title: 'Job already exists',
      text: (
        <p>
          There&apos;s already a job running for anomaly detection on{' '}
          {serviceName} ({transactionType}
          ).{' '}
          <ViewMLJob
            serviceName={serviceName}
            transactionType={transactionType}
            location={location}
          >
            View existing job
          </ViewMLJob>
        </p>
      )
    });
  };

  public addSuccessToast = () => {
    const {
      serviceName,
      transactionType = 'all transactions',
      location
    } = this.props;
    toastNotifications.addSuccess({
      title: 'Job successfully created',
      text: (
        <p>
          The analysis is now running for {serviceName} ({transactionType}
          ). It might take a while before results are added to the response
          times graph.{' '}
          <ViewMLJob
            serviceName={serviceName}
            transactionType={transactionType}
            location={location}
          >
            View job
          </ViewMLJob>
        </p>
      )
    });
  };

  public render() {
    const { isOpen, onClose, serviceName, transactionType } = this.props;
    const { isLoading, hasIndexPattern, hasMlJob } = this.state;

    if (!isOpen) {
      return null;
    }

    return (
      <EuiFlyout onClose={onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>Enable anomaly detection on response times</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {hasMlJob && (
            <div>
              <EuiCallOut
                title={<span>Job already exists</span>}
                color="success"
                iconType="check"
              >
                <p>
                  There is currently a job running for {serviceName} (
                  {transactionType || 'all types'}
                  ).{' '}
                  <ViewMLJob
                    serviceName={serviceName}
                    transactionType={transactionType}
                    location={location}
                  >
                    View existing job
                  </ViewMLJob>
                </p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </div>
          )}

          {!hasIndexPattern && (
            <div>
              <EuiCallOut
                title={
                  <span>
                    No APM index pattern available. To create a job, please
                    import the APM index pattern via the{' '}
                    <KibanaLink
                      pathname={'/app/kibana'}
                      hash={`/home/tutorial/apm`}
                    >
                      Setup Instructions
                    </KibanaLink>
                  </span>
                }
                color="warning"
                iconType="alert"
              />
              <EuiSpacer size="m" />
            </div>
          )}

          <EuiText>
            <p>
              This integration will start a new Machine Learning job that is
              predefined to calculate anomaly scores on response times on APM
              transactions for the {serviceName} service ($
              {transactionType || 'all'} transactions). Once enabled,{' '}
              <b>the response time graph</b> will show the expected bounds from
              the Machine Learning job and annotate the graph once the anomaly
              score is &gt;=75.
            </p>
            {/* <img
              src="/plugins/apm/images/apm-ml-anomaly-detection-example.png"
              alt="Anomaly detection on response times in APM"
            /> */}
            <p>
              Jobs can be created per transaction type and based on the average
              response time. Once a job is created, you can manage it and see
              more details in the{' '}
              <KibanaLink pathname={'/app/ml'}>
                Machine Learning jobs management page
              </KibanaLink>
              . It might take some time for the job to calculate the results.
              Please refresh the graph a few minutes after creating the job.
            </p>
            <p>
              {/* <a href="#">Learn more</a> about the Machine Learning integration. */}
            </p>
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup alignItems="flexEnd" direction="rowReverse">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.createJob}
                fill
                disabled={isLoading || hasMlJob || !hasIndexPattern}
              >
                Create new job for this service ({transactionType || 'all'}{' '}
                transactions)
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
