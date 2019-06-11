/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../constants';
import { getRouterLinkProps } from '../../../services';
import { ConfiguredByNodeWarning } from '../../components';
import { ConnectionStatus, RemoveClusterButtonProvider } from '../components';

export class DetailPanel extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    cluster: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
    clusterName: PropTypes.string,
  }

  renderSkipUnavailableValue(skipUnavailable) {
    if (skipUnavailable === true) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.detailPanel.skipUnavailableTrueValue"
          defaultMessage="Yes"
        />
      );
    }

    if (skipUnavailable === false) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.detailPanel.skipUnavailableFalseValue"
          defaultMessage="No"
        />
      );
    }

    return (
      <FormattedMessage
        id="xpack.remoteClusters.detailPanel.skipUnavailableNullValue"
        defaultMessage="Default"
      />
    );
  }

  renderClusterNotFound() {
    return (
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="s"
        data-test-subj="remoteClusterDetailClusterNotFound"
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
    );
  }

  renderClusterConfiguredByNodeWarning({ isConfiguredByNode }) {
    if (!isConfiguredByNode) {
      return null;
    }
    return (
      <Fragment>
        <ConfiguredByNodeWarning />
        <EuiSpacer size="l" />
      </Fragment>
    );
  }

  renderCluster({
    isConnected,
    connectedNodesCount,
    skipUnavailable,
    seeds,
    maxConnectionsPerCluster,
    initialConnectTimeout,
  }) {
    return (
      <section
        aria-labelledby="xpack.remoteClusters.detailPanel.statusTitle"
        data-test-subj="remoteClusterDetailPanelStatusSection"
      >
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.remoteClusters.detailPanel.statusTitle"
              defaultMessage="Status"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiDescriptionList data-test-subj="remoteClusterDetailPanelStatusValues">
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

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailIsConnected">
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

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailConnectedNodesCount">
                {connectedNodesCount}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.seedsLabel"
                    defaultMessage="Seeds"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailSeeds">
                {seeds.map(seed => <EuiText key={seed}>{seed}</EuiText>)}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.skipUnavailableLabel"
                    defaultMessage="Skip unavailable"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailSkipUnavailable">
                {this.renderSkipUnavailableValue(skipUnavailable)}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.maxConnectionsPerClusterLabel"
                    defaultMessage="Maximum number of connections"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailMaxConnections">
                {maxConnectionsPerCluster}
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiDescriptionListTitle>
                <EuiTitle size="xs">
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.initialConnectTimeoutLabel"
                    defaultMessage="Initial connect timeout"
                  />
                </EuiTitle>
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="remoteClusterDetailInitialConnectTimeout">
                {initialConnectTimeout}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </section>
    );
  }

  renderFlyoutBody() {
    const { cluster } = this.props;

    return (
      <EuiFlyoutBody>
        {!cluster && (
          this.renderClusterNotFound()
        )}
        {cluster && (
          <Fragment>
            {this.renderClusterConfiguredByNodeWarning(cluster)}
            {this.renderCluster(cluster)}
          </Fragment>
        )}
      </EuiFlyoutBody>
    );
  }

  renderFlyoutFooter() {
    const {
      cluster,
      clusterName,
      closeDetailPanel,
    } = this.props;

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={closeDetailPanel}
              data-test-subj="remoteClusterDetailsPanelCloseButton"
            >
              <FormattedMessage
                id="xpack.remoteClusters.detailPanel.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          {cluster && !cluster.isConfiguredByNode && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <RemoveClusterButtonProvider clusterNames={[clusterName]}>
                    {(removeCluster) => (
                      <EuiButtonEmpty
                        color="danger"
                        onClick={removeCluster}
                        data-test-subj="remoteClusterDetailPanelRemoveButton"
                      >
                        <FormattedMessage
                          id="xpack.remoteClusters.detailPanel.removeButtonLabel"
                          defaultMessage="Remove"
                        />
                      </EuiButtonEmpty>
                    )}
                  </RemoveClusterButtonProvider>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButton
                    {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/edit/${clusterName}`)}
                    fill
                    color="primary"
                    data-test-subj="remoteClusterDetailPanelEditButton"
                  >
                    <FormattedMessage
                      id="xpack.remoteClusters.detailPanel.editButtonLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  render() {
    const { isOpen, closeDetailPanel, clusterName } = this.props;

    if (!isOpen) {
      return null;
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
          <EuiTitle
            size="m"
            id="remoteClusterDetailsFlyoutTitle"
            data-test-subj="remoteClusterDetailsFlyoutTitle"
          >
            <h2>{clusterName}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderFlyoutBody()}

        {this.renderFlyoutFooter()}
      </EuiFlyout>
    );
  }
}
