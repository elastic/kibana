/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
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
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../constants';

import { ConnectionStatus, DisconnectButton } from '../components';

const disconnectButtonDisabledReason = i18n.translate(
  'xpack.remoteClusters.detailPanel.disconnectButtonDisabledReason',
  { defaultMessage: 'Cannot disconnect from cluster configured in elasticsearch.yml' }
);

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

  renderSkipUnavailableValue(value) {
    if(value === true) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.detailPanel.skipUnavailableTrueValue"
          defaultMessage="Yes"
        />
      );
    }

    if(value === false) {
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

  renderSettings(settings) {
    const {
      seeds,
      skipUnavailable,
    } = settings;

    return (
      <EuiDescriptionList>
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
    );
  }

  renderActiveSettingBadge(isActive) {
    if(isActive) {
      return (
        <EuiBadge color="primary">
          <FormattedMessage
            id="xpack.remoteClusters.detailPanel.activeSettingBadge"
            defaultMessage="Active"
          />
        </EuiBadge>
      );
    }
    return (
      <EuiBadge color="hollow">
        <FormattedMessage
          id="xpack.remoteClusters.detailPanel.fallbackSettingBadge"
          defaultMessage="Fallback"
        />
      </EuiBadge>
    );
  }

  renderCluster() {
    const { cluster } = this.props;
    const { isConnected, connectedNodesCount } = cluster;

    return (
      <Fragment>
        <EuiFlyoutBody>

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
          </EuiDescriptionList>
          {this.renderSettings(cluster)}

          <EuiHorizontalRule />

          {cluster.transientSettings ? (
            <Fragment>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.transientSettingsTitle"
                    defaultMessage="Transient settings"
                  />
                  {' '}{this.renderActiveSettingBadge(true)}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {this.renderSettings(cluster.transientSettings)}
              <EuiSpacer size="l" />
            </Fragment>
          ) : null}

          {cluster.persistentSettings ? (
            <Fragment>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.persistentSettingsTitle"
                    defaultMessage="Persistent settings"
                  />
                  {' '}{this.renderActiveSettingBadge(!cluster.transientSettings)}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {this.renderSettings(cluster.persistentSettings)}
              <EuiSpacer size="l" />
            </Fragment>
          ) : null}

          {!cluster.transientSettings && !cluster.persistentSettings ? (
            <Fragment>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.remoteClusters.detailPanel.configurationFileSettingsTitle"
                    defaultMessage="Configuration file settings"
                  />
                  {' '}{this.renderActiveSettingBadge(true)}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {this.renderSettings(cluster)}
            </Fragment>
          ) : null}
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

    const isDisconnectDisabled = !cluster || !(cluster.isTransient || cluster.isPersistent);

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
              <DisconnectButton
                clusterNames={[clusterName]}
                isSmallButton={true}
                isDisabled={isDisconnectDisabled}
                disabledReason={isDisconnectDisabled ? disconnectButtonDisabledReason : null}
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
      </EuiFlyout>
    );
  }
}

export const DetailPanel = injectI18n(DetailPanelUi);
