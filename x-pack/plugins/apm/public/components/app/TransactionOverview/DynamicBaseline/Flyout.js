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
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiGlobalToastList
} from '@elastic/eui';

import { KibanaLink } from '../../../../utils/url';

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
    this.setState({
      toasts: [
        {
          id: 2,
          title: 'Creating dynamic baseline failed',
          color: 'warning',
          text: (
            <p>
              Make sure a dynamic baseline does not already exist for this
              service
            </p>
          )
        }
      ]
    });
  };

  addSuccessToast = id => {
    this.setState({
      toasts: [
        {
          id: 1,
          title: 'Dynamic baseline created!',
          color: 'success',
          text: (
            <p>
              The watch is now ready and will send error reports for{' '}
              {this.props.serviceName}.{' '}
              <KibanaLink
                pathname={'/app/kibana'}
                hash={`/management/elasticsearch/watcher/watches/watch/${id}`}
                query={{}}
              >
                View watch.
              </KibanaLink>
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
      <EuiFlyout onClose={this.props.onClose} size="m">
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
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={this.props.onClose}
                flush="left"
              >
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.createDynamicBaseline}
                fill
                disabled={this.state.isLoading || this.props.hasDynamicBaseline}
              >
                Create watch
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
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
