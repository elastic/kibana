/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

export class DetailPanelUi extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    cluster: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
    clusterName: PropTypes.string,
  }

  constructor(props) {
    super(props);
  }

  renderTabs() {
    const { cluster } = this.props;

    if (!cluster) {
      return;
    }

    return (
      <div>Remote cluster details</div>
    );
  }

  renderCluster() {
    // const { cluster, intl } = this.props;

    return (
      <Fragment>
        <EuiFlyoutBody>
          <div>Remote cluster details</div>
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  render() {
    const {
      isOpen,
      isLoading,
      closeDetailPanel,
      cluster,
      clusterName,
    } = this.props;

    if (!isOpen) {
      return null;
    }

    let content;

    if (isLoading) {
      content = (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.loadingLabel"
                    defaultMessage="Loading remote cluster..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    if (cluster) {
      content = this.renderCluster();
    } else {
      content = (
        <EuiFlyoutBody>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="alert" color="danger" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.notFoundLabel"
                    defaultMessage="Remote cluster not found"
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      );
    }

    return (
      <EuiFlyout
        data-test-subj="remoteClusterDetailFlyout"
        onClose={closeDetailPanel}
        aria-labelledby="remoteClusterDetailsFlyoutTitle"
        size="m"
        maxWidth={400}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m" id="remoteClusterDetailsFlyoutTitle">
            <h2>{clusterName}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {content}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
