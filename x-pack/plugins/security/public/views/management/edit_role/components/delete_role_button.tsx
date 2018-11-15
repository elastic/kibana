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
          Delete role
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
          title={'Delete Role'}
          onCancel={this.closeModal}
          onConfirm={this.onConfirmDelete}
          cancelButtonText={"No, don't delete"}
          confirmButtonText={'Yes, delete role'}
          buttonColor={'danger'}
        >
          <p>Are you sure you want to delete this role?</p>
          <p>This action cannot be undone!</p>
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
