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
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

export class DisconnectButtonUi extends Component {
  static propTypes = {
    disconnectClusters: PropTypes.func.isRequired,
    clusterNames: PropTypes.array.isRequired,
    isSmallButton: PropTypes.bool,
  };

  constructor(props) {
    super(props);

    this.state = {
      isModalOpen: false,
    };
  }

  showConfirmModal = () => {
    this.setState({
      isModalOpen: true,
    });
  };

  closeConfirmModal = () => {
    this.setState({
      isModalOpen: false,
    });
  };

  onConfirm = () => {
    const { disconnectClusters, clusterNames } = this.props;
    disconnectClusters(clusterNames);
    this.closeConfirmModal();
  }

  renderButtonText() {
    const { clusterNames, isSmallButton } = this.props;
    const isSingleCluster = clusterNames.length === 1;

    if (isSmallButton) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.disconnectButton.shortButtonLabel"
          defaultMessage="Disconnect"
        />
      );
    }

    if (isSingleCluster) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.disconnectButton.singleButtonLabel"
          defaultMessage="Disconnect remote cluster"
        />
      );
    }

    return (
      <FormattedMessage
        id="xpack.remoteClusters.disconnectButton.multipleButtonLabel"
        defaultMessage="Disconnect {count} remote clusters"
        values={{ count: clusterNames.length }}
      />
    );
  }

  render() {
    const { intl, clusterNames } = this.props;
    const { isModalOpen } = this.state;
    const isSingleCluster = clusterNames.length === 1;

    let modal;

    if (isModalOpen) {
      const title = isSingleCluster ? intl.formatMessage({
        id: 'xpack.remoteClusters.disconnectButton.confirmModal.deleteSingleClusterTitle',
        defaultMessage: 'Disconnect remote cluster \'{name}\'?',
      }, { name: clusterNames[0] }) : intl.formatMessage({
        id: 'xpack.remoteClusters.disconnectButton.confirmModal.multipleDeletionTitle',
        defaultMessage: 'Disconnect {count} remote clusters?',
      }, { count: clusterNames.length });

      const content = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.disconnectButton.confirmModal.multipleDeletionDescription"
              defaultMessage="You are about to disconnect from {isSingleCluster, plural, one
                {this cluster} other {these clusters}}"
              values={{ isSingleCluster: isSingleCluster ? 1 : 0 }}
            />
          </p>
          { isSingleCluster ? null : (<ul>{clusterNames.map(name => <li key={name}>{name}</li>)}</ul>)}
        </Fragment>
      );

      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={title}
            onCancel={this.closeConfirmModal}
            onConfirm={this.onConfirm}
            cancelButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.disconnectButton.confirmModal.cancelButtonText',
                defaultMessage: 'Cancel',
              })
            }
            buttonColor="danger"
            confirmButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.disconnectButton.confirmModal.confirmButtonText',
                defaultMessage: 'Disconnect',
              })
            }
          >
            {content}
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <EuiButton
          color="danger"
          onClick={this.showConfirmModal}
        >
          {this.renderButtonText()}
        </EuiButton>
        {modal}
      </Fragment>
    );
  }
}

export const DisconnectButton = injectI18n(DisconnectButtonUi);
