/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../constants';

import { ConnectionStatus } from '../components';

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

  renderCluster() {
    const { cluster } = this.props;
    const { isConnected, seeds, connectedNodesCount } = cluster;

    const renderedSeeds = seeds.map(seed => <EuiText key={seed}>{seed}</EuiText>);

    return (
      <Fragment>
        <EuiFlyoutBody>
          <EuiDescriptionList>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.remoteClusters.detailPanel.connectedLabel"
                      defaultMessage="Connection"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  <ConnectionStatus isConnected={isConnected} />
                </EuiDescriptionListDescription>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  <EuiTitle size="xs">
                    <FormattedMessage
                      id="xpack.remoteClusters.detailPanel.connectedNodesLabel"
                      defaultMessage="Connected nodes"
                    />
                  </EuiTitle>
                </EuiDescriptionListTitle>

                <EuiDescriptionListDescription>
                  {connectedNodesCount}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiDescriptionListTitle>
              <EuiTitle size="xs">
                <FormattedMessage
                  id="xpack.remoteClusters.detailPanel.seedsLabel"
                  defaultMessage="Seeds"
                />
              </EuiTitle>
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription>
              {renderedSeeds}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
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
    } else if (cluster) {
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

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton color="danger">
                <FormattedMessage
                  id="xpack.remoteClusters.detailPanel.disconnectButtonLabel"
                  defaultMessage="Disconnect"
                />
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                href={`#${CRUD_APP_BASE_PATH}/edit/${clusterName}`}
                fill
                color="primary"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.detailPanel.editButtonLabel"
                  defaultMessage="Edit"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
