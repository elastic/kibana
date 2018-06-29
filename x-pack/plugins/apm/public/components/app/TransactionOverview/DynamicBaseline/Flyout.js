/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { startMlJob } from '../../../../services/rest/ml';
import { getAPMIndexPattern } from '../../../../services/rest/savedObjects';
import {
  EuiButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiGlobalToastList,
  EuiText,
  EuiTitle,
  EuiSpacer
} from '@elastic/eui';
import { getMlJobUrl } from '../../../../utils/url';

export default class DynamicBaselineFlyout extends Component {
  state = {
    toasts: [],
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
    this.setState({
      toasts: [
        {
          id: 2,
          title: 'Baseline job already exists',
          color: 'warning',
          text: (
            <p>
              There&apos;s already a baseline job running on {serviceName} for{' '}
              {transactionType}.{' '}
              <a href={getMlJobUrl(serviceName, transactionType, location)}>
                View existing job.
              </a>
            </p>
          )
        }
      ]
    });
  };

  addSuccessToast = () => {
    const { serviceName, transactionType, location } = this.props;
    this.setState({
      toasts: [
        {
          id: 1,
          title: 'Baseline job created',
          color: 'success',
          text: (
            <p>
              The analysis is now running on {serviceName} and you will start
              seeing results show up on the response times graph.{' '}
              <a href={getMlJobUrl(serviceName, transactionType, location)}>
                View job.
              </a>
            </p>
          )
        }
      ]
    });
  };

  removeToasts = () => {
    this.setState({
      toasts: []
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
    const { isLoading, hasIndexPattern, toasts } = this.state;

    const flyout = (
      <EuiFlyout onClose={onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>Enable anomaly detection on response times</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <h6>This feature is currently in beta</h6>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {hasDynamicBaseline && (
            <div>
              <EuiCallOut
                title={<span>Job already exists. </span>}
                color="success"
                iconType="check"
              >
                <p>
                  Machine Learning is currently running a job on {serviceName} ({
                    transactionType
                  }).{' '}
                  <a href={getMlJobUrl(serviceName, transactionType, location)}>
                    View existing job
                  </a>
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
                    There is no APM index pattern available. To create a job,
                    please import the APM index pattern via the{' '}
                    <a href="/app/kibana#/home/tutorial/apm">
                      APM Setup Instructions
                    </a>
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
              transactions. Once enabled, the APM response time graph will show
              the expected bounds from the Machine Learning job and annotate the
              graph once the anomaly score is &gt;=75.
            </p>
            <img
              src="/plugins/apm/images/dynamic_baseline.png"
              alt="Machine Learning in APM"
            />
            <p>
              The jobs can be created per transaction type and based on the
              average response time. Once the job is created, you can manage it
              and see more details in the{' '}
              <a href="/app/ml">Machine Learning jobs management page</a>. It
              can take some time for the job to calculate the results. Please
              refresh the graph a few minutes after enabling the job.
            </p>
            <p>
              <a href="#">Learn more</a> about the Machine Learning integration
              in APM.
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

    return (
      <React.Fragment>
        {isOpen && flyout}
        <EuiGlobalToastList
          toasts={toasts}
          dismissToast={this.removeToasts}
          toastLifeTimeMs={5000}
        />
      </React.Fragment>
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
