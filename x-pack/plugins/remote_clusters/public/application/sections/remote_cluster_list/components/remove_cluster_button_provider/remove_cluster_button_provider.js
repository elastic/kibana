/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiConfirmModal } from '@elastic/eui';

export class RemoveClusterButtonProvider extends Component {
  static propTypes = {
    removeClusters: PropTypes.func.isRequired,
    clusterNames: PropTypes.array.isRequired,
    children: PropTypes.func.isRequired,
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
  };

  render() {
    const { clusterNames, children } = this.props;
    const { isModalOpen } = this.state;
    const isSingleCluster = clusterNames.length === 1;
    let modal;

    if (isModalOpen) {
      const title = isSingleCluster
        ? i18n.translate(
            'xpack.remoteClusters.removeButton.confirmModal.deleteSingleClusterTitle',
            {
              defaultMessage: "Remove remote cluster '{name}'?",
              values: { name: clusterNames[0] },
            }
          )
        : i18n.translate('xpack.remoteClusters.removeButton.confirmModal.multipleDeletionTitle', {
            defaultMessage: 'Remove {count} remote clusters?',
            values: { count: clusterNames.length },
          });

      const content = (
        <Fragment>
          <p>
            <FormattedMessage
              id="xpack.remoteClusters.removeButton.confirmModal.multipleDeletionDescription"
              defaultMessage="You are about to remove these remote clusters:"
            />
          </p>
          <ul>
            {clusterNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Fragment>
      );

      modal = (
        <>
          {/* eslint-disable-next-line jsx-a11y/mouse-events-have-key-events */}
          <EuiConfirmModal
            data-test-subj="remoteClustersDeleteConfirmModal"
            title={title}
            onCancel={this.closeConfirmModal}
            onConfirm={this.onConfirm}
            cancelButtonText={i18n.translate(
              'xpack.remoteClusters.removeButton.confirmModal.cancelButtonText',
              {
                defaultMessage: 'Cancel',
              }
            )}
            buttonColor="danger"
            confirmButtonText={i18n.translate(
              'xpack.remoteClusters.removeButton.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Remove',
              }
            )}
            onMouseOver={this.onMouseOverModal}
          >
            {!isSingleCluster && content}
          </EuiConfirmModal>
        </>
      );
    }

    return (
      <Fragment>
        {children(this.showConfirmModal)}
        {modal}
      </Fragment>
    );
  }
}
