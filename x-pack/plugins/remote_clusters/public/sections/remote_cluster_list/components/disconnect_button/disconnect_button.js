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
    disconnectRemoteClusters: PropTypes.func.isRequired,
    clusterNames: PropTypes.array.isRequired,
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

  render() {
    const { disconnectRemoteClusters, clusterNames, intl } = this.props;
    const { isModalOpen } = this.state;

    let modal;

    if (isModalOpen) {
      modal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={intl.formatMessage({
              id: 'xpack.remoteClusters.disconnectButton.confirmModal.modalTitle',
              defaultMessage: 'Disconnect remote clusters?',
            })}
            onCancel={this.closeConfirmModal}
            onConfirm={() => disconnectRemoteClusters(clusterNames)}
            cancelButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.disconnectButton.confirmModal.cancelButtonText',
                defaultMessage: 'Cancel',
              })
            }
            confirmButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.disconnectButton.confirmModal.confirmButtonText',
                defaultMessage: 'Disconnect',
              })
            }
          />
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <EuiButton color="danger" onClick={this.showConfirmModal}>
          <FormattedMessage
            id="xpack.remoteClusters.disconnectButton.buttonLabel"
            defaultMessage="Disconnect remote clusters"
          />
        </EuiButton>

        {modal}
      </Fragment>
    );
  }
}

export const DisconnectButton = injectI18n(DisconnectButtonUi);
