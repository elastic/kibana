/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { toastNotifications } from 'ui/notify';
import { RolesApi } from '../../../../../lib/roles_api';

interface Props {
  rolesToDelete: string[];
  intl: InjectedIntl;
  callback: (rolesToDelete: string[], errors: string[]) => void;
  onCancel: () => void;
}

interface State {
  deleteInProgress: boolean;
}

class ConfirmDeleteUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      deleteInProgress: false,
    };
  }

  public render() {
    const { rolesToDelete, intl } = this.props;
    const moreThanOne = rolesToDelete.length > 1;
    const title = intl.formatMessage(
      {
        id: 'xpack.security.management.roles.deleteRoleTitle',
        defaultMessage: 'Delete role{value, plural, one {{roleName}} other {s}}',
      },
      { value: rolesToDelete.length, roleName: ` ${rolesToDelete[0]}` }
    );

    // This is largely the same as the built-in EuiConfirmModal component, but we needed the ability
    // to disable the buttons since this could be a long-running operation

    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onCancel}>
          <EuiModalHeader>
            <EuiModalHeaderTitle data-test-subj="confirmModalTitleText">
              {title}
            </EuiModalHeaderTitle>
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
                    {rolesToDelete.map(roleName => (
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
      </EuiOverlayMask>
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
    const { rolesToDelete, callback } = this.props;
    const errors: string[] = [];
    const deleteOperations = rolesToDelete.map(roleName => {
      const deleteRoleTask = async () => {
        try {
          await RolesApi.deleteRole(roleName);
          toastNotifications.addSuccess(
            this.props.intl.formatMessage(
              {
                id:
                  'xpack.security.management.roles.confirmDelete.roleSuccessfullyDeletedNotificationMessage',
                defaultMessage: 'Deleted role {roleName}',
              },
              { roleName }
            )
          );
        } catch (e) {
          errors.push(roleName);
          toastNotifications.addDanger(
            this.props.intl.formatMessage(
              {
                id:
                  'xpack.security.management.roles.confirmDelete.roleDeletingErrorNotificationMessage',
                defaultMessage: 'Error deleting role {roleName}',
              },
              { roleName }
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

export const ConfirmDelete = injectI18n(ConfirmDeleteUI);
