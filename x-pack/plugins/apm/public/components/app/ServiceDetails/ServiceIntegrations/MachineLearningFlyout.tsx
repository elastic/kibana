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
import {
  getMLJob,
  startMLJob
} from 'x-pack/plugins/apm/public/services/rest/ml';
import {
  getAPMIndexPattern,
  ISavedObject
} from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { KibanaLink, ViewMLJob } from 'x-pack/plugins/apm/public/utils/url';

interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  transactionType?: string;
  location: any;
  serviceTransactionTypes: string[];
}

interface FlyoutState {
  isLoading: boolean;
  hasMLJob: boolean;
  hasIndexPattern: boolean;
}

export class MachineLearningFlyout extends Component<FlyoutProps, FlyoutState> {
  public state = {
    isLoading: false,
    hasIndexPattern: false,
    hasMLJob: false
  };

  public componentDidMount() {
    getAPMIndexPattern().then((indexPattern?: ISavedObject) => {
      this.setState({ hasIndexPattern: !!indexPattern });
    });
    this.checkForMLJob();
  }

  public componentDidUpdate(prevProps: FlyoutProps) {
    if (
      prevProps.serviceName !== this.props.serviceName ||
      prevProps.transactionType !== this.props.transactionType
    ) {
      this.checkForMLJob();
    }
  }

  public async checkForMLJob() {
    const { serviceName, transactionType } = this.props;
    const { count } = await getMLJob({
      serviceName,
      transactionType
    });
    this.setState({ hasMLJob: count > 0 });
  }

  public createJob = async () => {
    this.setState({ isLoading: true });
    try {
      const { serviceName, transactionType } = this.props;
      if (serviceName) {
        const res = await startMLJob({ serviceName, transactionType });
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
    const { serviceName, transactionType, location } = this.props;
    toastNotifications.addWarning({
      title: 'Job already exists',
      text: (
        <p>
          There&apos;s already a job running for anomaly detection on{' '}
          {serviceName} ({transactionType}).{' '}
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
    const { isLoading, hasIndexPattern, hasMLJob } = this.state;

    if (!isOpen) {
      return null;
    }

    return (
      <EuiFlyout onClose={onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>Enable anomaly detection</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {hasMLJob && (
            <div>
              <EuiCallOut
                title="Job already exists"
                color="success"
                iconType="check"
              >
                <p>
                  There is currently a job running for {serviceName} (
                  {transactionType}
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
            <div>
              <p>EUI Combo box here, with:</p>
              <ul>
                {this.props.serviceTransactionTypes.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </EuiText>

          <EuiText>
            <p>
              Here you can create a machine learning job to calculate anomaly
              scores on durations for APM transactions within the {serviceName}{' '}
              service. Once enabled, <b>the transaction duration graph</b> will
              show the expected bounds and annotate the graph once the anomaly
              score is &gt;=75.
            </p>
            <p>
              Jobs can be created for each service + transaction type
              combination. Once a job is created, you can manage it and see more
              details in the{' '}
              <KibanaLink pathname={'/app/ml'}>
                Machine Learning jobs management page
              </KibanaLink>
              .{' '}
            </p>
            <p>
              <em>
                Note: It might take a few minutes for the job to begin
                calculating results.
              </em>
            </p>
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup alignItems="flexEnd" direction="rowReverse">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.createJob}
                fill
                disabled={isLoading || hasMLJob || !hasIndexPattern}
              >
                Create new job
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
