/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  // @ts-ignore
  EuiConfirmModal,
  // @ts-ignore
  EuiOverlayMask,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';

interface Props {
  canDelete: boolean;
  onDelete: () => void;
}

interface State {
  showModal: boolean;
}

export class DeleteRoleButton extends Component<Props, State> {
  public state = {
    showModal: false,
  };

  public render() {
    if (!this.props.canDelete) {
      return null;
    }

    return (
      <Fragment>
        <EuiButtonEmpty color={'danger'} onClick={this.showModal}>
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.deleteRoleButtonLabel"
            defaultMessage="Delete role"
          />
        </EuiButtonEmpty>
        {this.maybeShowModal()}
      </Fragment>
    );
  }

  public maybeShowModal = () => {
    if (!this.state.showModal) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deleteRoleTitle"
              defaultMessage="Delete Role"
            />
          }
          onCancel={this.closeModal}
          onConfirm={this.onConfirmDelete}
          cancelButtonText={
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.cancelButtonLabel"
              defaultMessage="No, don't delete"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.confirmButtonLabel"
              defaultMessage="Yes, delete role"
            />
          }
          buttonColor={'danger'}
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deletingRoleConfirmationText"
              defaultMessage="Are you sure you want to delete this role?"
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deletingRoleWarningText"
              defaultMessage="This action cannot be undone!"
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  public closeModal = () => {
    this.setState({
      showModal: false,
    });
  };

  public showModal = () => {
    this.setState({
      showModal: true,
    });
  };

  public onConfirmDelete = () => {
    this.closeModal();
    this.props.onDelete();
  };
}
