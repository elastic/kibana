/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { startMlJob } from '../../../../services/rest/ml';

import {
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiGlobalToastList
} from '@elastic/eui';

export default class DynamicBaselineFlyout extends Component {
  state = {
    toasts: [],
    isLoading: false
  };

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
    const { serviceName, transactionType } = this.props;
    this.setState({
      toasts: [
        {
          id: 2,
          title: 'Baseline job already exists',
          color: 'warning',
          text: (
            <p>
              There&apos;s already a baseline job running on {serviceName} for{' '}
              {transactionType}. <a href="/app/ml">View existing job.</a>
            </p>
          )
        }
      ]
    });
  };

  addSuccessToast = () => {
    const { serviceName } = this.props;
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
              <a href="">View job.</a>
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
    const flyout = (
      <EuiFlyout onClose={this.props.onClose} size="s">
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>Create dynamic baseline</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              You can create a dynamic baseline with Machine Learning by the
              click of a button. This allows you to catch anomalies and unusual
              behaviour far quicker than before. The baseline is derived from
              the 95th percentile response time, which is great to catching
              performance issues that might be on the rise.
            </p>
            <img
              src="/plugins/apm/images/dynamic_baseline.png"
              alt="Machine Learning in APM"
            />
            <p>
              Once the job has been created, you will immediately see a baseline
              on the Response times graph. You can always stop or remove your
              baseline by{' '}
              <a href="/app/ml">viewing your Machine Learning jobs</a> and edit
              it from there.
            </p>
            {this.props.hasDynamicBaseline &&
              'A dynamic baseline already exists'}
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
            disabled={this.state.isLoading || this.props.hasDynamicBaseline}
          >
            Create dynamic baseline
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );

    return (
      <React.Fragment>
        {this.props.isOpen && flyout}
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={this.removeToasts}
          toastLifeTimeMs={5000}
        />
      </React.Fragment>
    );
  }
}

DynamicBaselineFlyout.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  serviceName: PropTypes.string,
  onClose: PropTypes.func.isRequired
};
