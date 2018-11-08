/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { startMlJob } from '../../../../services/rest/ml';
import { getAPMIndexPattern } from '../../../../services/rest/savedObjects';
import {
  EuiButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiSpacer
} from '@elastic/eui';
import { KibanaLink, ViewMLJob } from '../../../../utils/url';

export default class DynamicBaselineFlyout extends Component {
  state = {
    isLoading: false,
    hasIndexPattern: null
  };

  componentDidMount() {
    getAPMIndexPattern().then(indexPattern => {
      this.setState({ hasIndexPattern: indexPattern != null });
    });
  }

  createDynamicBaseline = async () => {
    this.setState({ isLoading: true });
    try {
      const { serviceName, transactionType } = this.props;
      if (serviceName && transactionType) {
        const res = await startMlJob({ serviceName, transactionType });
        const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
        if (!didSucceed) {
          throw new Error('Creating dynamic baseline failed');
        }
        this.addSuccessToast();
      }
    } catch (e) {
      console.error(e);
      this.addErrorToast();
    }

    this.setState({ isLoading: false });
    this.props.onClose();
  };

  addErrorToast = () => {
    const { serviceName, transactionType, location } = this.props;
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

  addSuccessToast = () => {
    const { serviceName, transactionType, location } = this.props;
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

  render() {
    const {
      hasDynamicBaseline,
      isOpen,
      location,
      onClose,
      serviceName,
      transactionType
    } = this.props;
    const { isLoading, hasIndexPattern } = this.state;

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
          {hasDynamicBaseline && (
            <div>
              <EuiCallOut
                title={<span>Job already exists</span>}
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
            <p>
              This integration will start a new Machine Learning job that is
              predefined to calculate anomaly scores on response times on APM
              transactions. Once enabled, the response time graph will show the
              expected bounds from the Machine Learning job and annotate the
              graph once the anomaly score is &gt;=75.
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
        <EuiFlyoutFooter
          style={{
            flexDirection: 'row-reverse',
            display: 'flex'
          }}
        >
          <EuiButton
            onClick={this.createDynamicBaseline}
            fill
            disabled={isLoading || hasDynamicBaseline || !hasIndexPattern}
          >
            Create new job
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

DynamicBaselineFlyout.propTypes = {
  hasDynamicBaseline: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  serviceName: PropTypes.string,
  transactionType: PropTypes.string
};
