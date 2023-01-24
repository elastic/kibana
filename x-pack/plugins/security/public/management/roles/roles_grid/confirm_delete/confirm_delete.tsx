/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { RolesAPIClient } from '../../roles_api_client';

interface Props {
  rolesToDelete: string[];
  callback: (rolesToDelete: string[], errors: string[]) => void;
  onCancel: () => void;
  notifications: NotificationsStart;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
}

interface State {
  deleteInProgress: boolean;
}

export class ConfirmDelete extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      deleteInProgress: false,
    };
  }

  public render() {
    const { rolesToDelete } = this.props;
    const moreThanOne = rolesToDelete.length > 1;
    const title = i18n.translate('xpack.security.management.roles.deleteRoleTitle', {
      defaultMessage: 'Delete role{value, plural, one {{roleName}} other {s}}',
      values: { value: rolesToDelete.length, roleName: ` ${rolesToDelete[0]}` },
    });

    // This is largely the same as the built-in EuiConfirmModal component, but we needed the ability
    // to disable the buttons since this could be a long-running operation

    return (
      <EuiModal onClose={this.props.onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            {moreThanOne ? (
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.security.management.roles.confirmDelete.removingRolesDescription"
                    defaultMessage="You are about to delete these roles:"
                  />
                </p>
                <ul>
                  {rolesToDelete.map((roleName) => (
                    <li key={roleName}>{roleName}</li>
                  ))}
                </ul>
              </Fragment>
            ) : null}
            <p>
              <FormattedMessage
                id="xpack.security.management.roles.deletingRolesWarningMessage"
                defaultMessage="You can't undo this operation."
              />
            </p>
          </EuiText>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty
            data-test-subj="confirmModalCancelButton"
            onClick={this.props.onCancel}
            isDisabled={this.state.deleteInProgress}
          >
            <FormattedMessage
              id="xpack.security.management.roles.confirmDelete.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="confirmModalConfirmButton"
            onClick={this.onConfirmDelete}
            fill
            color={'danger'}
            isLoading={this.state.deleteInProgress}
          >
            <FormattedMessage
              id="xpack.security.management.roles.confirmDelete.deleteButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  private onConfirmDelete = () => {
    this.setState(
      {
        deleteInProgress: true,
      },
      () => {
        this.deleteRoles();
      }
    );
  };

  private deleteRoles = async () => {
    const { rolesToDelete, callback, rolesAPIClient, notifications } = this.props;
    const errors: string[] = [];
    const deleteOperations = rolesToDelete.map((roleName) => {
      const deleteRoleTask = async () => {
        try {
          await rolesAPIClient.deleteRole(roleName);
          notifications.toasts.addSuccess(
            i18n.translate(
              'xpack.security.management.roles.confirmDelete.roleSuccessfullyDeletedNotificationMessage',
              { defaultMessage: 'Deleted role {roleName}', values: { roleName } }
            )
          );
        } catch (e) {
          errors.push(roleName);
          notifications.toasts.addDanger(
            i18n.translate(
              'xpack.security.management.roles.confirmDelete.roleDeletingErrorNotificationMessage',
              { defaultMessage: 'Error deleting role {roleName}', values: { roleName } }
            )
          );
        }
      };

      return deleteRoleTask();
    });

    await Promise.all(deleteOperations);

    callback(rolesToDelete, errors);
  };
}
