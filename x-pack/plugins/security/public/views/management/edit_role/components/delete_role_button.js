/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';

export class DeleteRoleButton extends Component {
  static propTypes = {
    canDelete: PropTypes.bool.isRequired,
    onDelete: PropTypes.func.isRequired
  }

  state = {
    showModal: false
  }

  render() {
    if (!this.props.canDelete) {
      return null;
    }

    return (
      <Fragment>
        <EuiButton color={'danger'} iconType={'trash'} onClick={this.showModal}>
          Delete Role
        </EuiButton>
        {this.maybeShowModal()}
      </Fragment>
    );
  }

  maybeShowModal = () => {
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
          confirmButtonText={"Yes, delete role"}
          buttonColor={'danger'}
        >
          <p>Are you sure you want to delete this role?</p>
          <p>This action cannot be undone!</p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  closeModal = () => {
    this.setState({
      showModal: false
    });
  }

  showModal = () => {
    this.setState({
      showModal: true
    });
  }

  onConfirmDelete = () => {
    this.closeModal();
    this.props.onDelete();
  }
}

