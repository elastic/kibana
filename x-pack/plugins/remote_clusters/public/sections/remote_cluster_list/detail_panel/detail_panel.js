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
  EuiCallOut,
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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../constants';

import { ConnectionStatus, DisconnectButton } from '../components';

export class DetailPanelUi extends Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    cluster: PropTypes.object,
    closeDetailPanel: PropTypes.func.isRequired,
    clusterName: PropTypes.string,
    copyCluster: PropTypes.func.isRequired,
  }

  copyCluster = () => {
    const { copyCluster, cluster } = this.props;
    const {
      name,
      seeds,
      skipUnavailable,
    } = cluster;

    const clusterConfig = {
      name,
      seeds,
      skipUnavailable,
    };

    copyCluster(clusterConfig);
  }

  renderSkipUnavailableValue(skipUnavailable) {
    if(skipUnavailable === true) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.detailPanel.skipUnavailableTrueValue"
          defaultMessage="Yes"
        />
      );
    }

    if(skipUnavailable === false) {
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

  renderCluster() {
    const {
      cluster,
    } = this.props;

    const {
      isConnected,
      connectedNodesCount,
      skipUnavailable,
      seeds,
      isConfiguredByNode,
    } = cluster;

    let configuredByNodeWarning;

    if (isConfiguredByNode) {
      configuredByNodeWarning = (
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.remoteClusters.detailPanel.configuredByNodeWarningTitle"
                defaultMessage="This remote cluster is defined in a node's elasticsearch.yml
                  configuration file"
              />
            }
            color="warning"
            iconType="help"
          >
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.detailPanel.configuredByNodeWarningMessage"
                  defaultMessage="This can result in unexpected behavior if nodes have defined
                    different remote clusters in their configuration files. You can fix this by
                    manually removing this remote cluster from the configuration file or by
                    creating a persistent copy of it."
                />
              </p>

              <EuiButton
                onClick={this.copyCluster}
                color="warning"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.detailPanel.editButtonLabel"
                  defaultMessage="Create persistent copy"
                />
              </EuiButton>
            </Fragment>
          </EuiCallOut>

          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiFlyoutBody>
          {configuredByNodeWarning}

          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.remoteClusters.detailPanel.statusTitle"
                defaultMessage="Status"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

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

                <EuiDescriptionListDescription>
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

                <EuiDescriptionListDescription>
                  {this.renderSkipUnavailableValue(skipUnavailable)}
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiDescriptionList>
        </EuiFlyoutBody>
      </Fragment>
    );
  }

  renderContent() {
    const {
      isLoading,
      cluster,
    } = this.props;

    if (isLoading) {
      return (
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

    if (!cluster) {
      return (
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

    return this.renderCluster();
  }

  renderFooter() {
    const {
      cluster,
      clusterName,
    } = this.props;

    // Remote clusters configured by a node's elasticsearch.yml file can't be edited or disconnected.
    if (!cluster || cluster.isConfiguredByNode) {
      return null;
    }

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <DisconnectButton
              clusterNames={[clusterName]}
              isSmallButton={true}
            />
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
    );
  }

  render() {
    const {
      isOpen,
      closeDetailPanel,
      clusterName,
    } = this.props;

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
          <EuiTitle size="m" id="remoteClusterDetailsFlyoutTitle">
            <h2>{clusterName}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {this.renderContent()}

        {this.renderFooter()}
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
