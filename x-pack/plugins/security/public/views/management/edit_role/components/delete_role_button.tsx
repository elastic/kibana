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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';

interface Props {
  canDelete: boolean;
  onDelete: () => void;
}

interface State {
  showModal: boolean;
}

export class DeleteRoleButtonUI extends Component<Props, State> {
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
            id="xpack.security.views.management.editRoles.components.deleteRoleButton.deleteRoleButton"
            defaultMessage="Delete role"
          />
        </EuiButtonEmpty>
        {this.maybeShowModal()}
      </Fragment>
    );
  }

  public maybeShowModal = () => {
    const { intl } = this.props;
    if (!this.state.showModal) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={intl.formatMessage({
            id:
              'xpack.security.views.management.editRoles.components.deleteRoleButton.deleteRoleTitle',
            defaultMessage: 'Delete Role',
          })}
          onCancel={this.closeModal}
          onConfirm={this.onConfirmDelete}
          cancelButtonText={intl.formatMessage({
            id:
              'xpack.security.views.management.editRoles.components.deleteRoleButton.dontDeleteButton',
            defaultMessage: "No, don't delete",
          })}
          confirmButtonText={intl.formatMessage({
            id:
              'xpack.security.views.management.editRoles.components.deleteRoleButton.yesDeleteButton',
            defaultMessage: 'Yes, delete role',
          })}
          buttonColor={'danger'}
        >
          <p>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.deleteRoleButton.areYouSureTitle"
              defaultMessage="Are you sure you want to delete this role?"
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.views.management.editRoles.components.deleteRoleButton.actionCannotUndoneTitle"
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

export const DeleteRoleButton = injectI18n(DeleteRoleButtonUI);
