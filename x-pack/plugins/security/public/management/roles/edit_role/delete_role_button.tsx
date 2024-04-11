/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiConfirmModal } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import type { BuildFlavor } from '@kbn/config';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  roleName: string;
  canDelete: boolean;
  onDelete: () => void;
  buildFlavor?: BuildFlavor;
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
    const { buildFlavor, roleName } = this.props;
    if (!this.state.showModal) {
      return null;
    }
    return (
      <EuiConfirmModal
        title={
          buildFlavor !== 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deleteRoleTitle"
              defaultMessage="Delete Role"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.editCustomRole.deleteRoleButton.deleteRoleTitle"
              defaultMessage="Delete Role {roleName}?"
              values={{ roleName }}
            />
          )
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
          {buildFlavor !== 'serverless' ? (
            <FormattedMessage
              id="xpack.security.management.editRole.deleteRoleButton.deletingRoleConfirmationText"
              defaultMessage="Are you sure you want to delete this role?"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.roles.confirmDelete.serverless.removingSingleRoleDescription"
              defaultMessage="Users with the {roleName} role assigned will lose access to the project."
              values={{ roleName }}
            />
          )}
        </p>
        <p>
          <FormattedMessage
            id="xpack.security.management.editRole.deleteRoleButton.deletingRoleWarningText"
            defaultMessage="This action cannot be undone!"
          />
        </p>
      </EuiConfirmModal>
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
