/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiConfirmModal,
  EuiOverlayMask,
} from '@elastic/eui';

export class RemoveClusterButtonUi extends Component {
  static propTypes = {
    removeClusters: PropTypes.func.isRequired,
    clusterNames: PropTypes.array.isRequired,
    isSmallButton: PropTypes.bool,
    children: PropTypes.node,
  };

  static defaultProps = {
    children: (
      <EuiButton color="danger" />
    ),
  };

  state = {
    isModalOpen: false,
  };

  onMouseOverModal = (event) => {
    // This component can sometimes be used inside of an EuiToolTip, in which case mousing over
    // the modal can trigger the tooltip. Stopping propagation prevents this.
    event.stopPropagation();
  };

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
    const { removeClusters, clusterNames } = this.props;
    removeClusters(clusterNames);
    this.closeConfirmModal();
  }

  renderButtonText() {
    const { clusterNames, isSmallButton } = this.props;
    const isSingleCluster = clusterNames.length === 1;

    if (isSmallButton) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.removeButton.shortButtonLabel"
          defaultMessage="Remove"
        />
      );
    }

    if (isSingleCluster) {
      return (
        <FormattedMessage
          id="xpack.remoteClusters.removeButton.singleButtonLabel"
          defaultMessage="Remove remote cluster"
        />
      );
    }

    return (
      <FormattedMessage
        id="xpack.remoteClusters.removeButton.multipleButtonLabel"
        defaultMessage="Remove {count} remote clusters"
        values={{ count: clusterNames.length }}
      />
    );
  }

  render() {
    const { intl, clusterNames, children } = this.props;
    const { isModalOpen } = this.state;
    const isSingleCluster = clusterNames.length === 1;

    const button = cloneElement(children, {
      onClick: this.showConfirmModal,
    }, this.renderButtonText());

    let modal;

    if (isModalOpen) {
      const title = isSingleCluster ? intl.formatMessage({
        id: 'xpack.remoteClusters.removeButton.confirmModal.deleteSingleClusterTitle',
        defaultMessage: 'Remove remote cluster \'{name}\'?',
      }, { name: clusterNames[0] }) : intl.formatMessage({
        id: 'xpack.remoteClusters.removeButton.confirmModal.multipleDeletionTitle',
        defaultMessage: 'Remove {count} remote clusters?',
      }, { count: clusterNames.length });

      const content = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.removeButton.confirmModal.multipleDeletionDescription"
              defaultMessage="You are about to remove {isSingleCluster, plural, one
                {this remote cluster.} other {these remote clusters:}}"
              values={{ isSingleCluster: isSingleCluster ? 1 : 0 }}
            />
          </p>
          { isSingleCluster ? null : (<ul>{clusterNames.map(name => <li key={name}>{name}</li>)}</ul>)}
        </Fragment>
      );

      modal = (
        <EuiOverlayMask>
          { /* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events */ }
          <EuiConfirmModal
            title={title}
            onCancel={this.closeConfirmModal}
            onConfirm={this.onConfirm}
            cancelButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.removeButton.confirmModal.cancelButtonText',
                defaultMessage: 'Cancel',
              })
            }
            buttonColor="danger"
            confirmButtonText={
              intl.formatMessage({
                id: 'xpack.remoteClusters.removeButton.confirmModal.confirmButtonText',
                defaultMessage: 'Remove',
              })
            }
            onMouseOver={this.onMouseOverModal}
          >
            {content}
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        {button}
        {modal}
      </Fragment>
    );
  }
}

export const RemoveClusterButton = injectI18n(RemoveClusterButtonUi);
