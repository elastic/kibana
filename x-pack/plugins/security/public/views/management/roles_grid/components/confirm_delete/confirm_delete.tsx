/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
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

class ConfirmDeleteUI extends Component<Props, {}> {
  public deleteUsers = () => {
    const { rolesToDelete, callback } = this.props;
    const errors: string[] = [];
    rolesToDelete.forEach(async roleName => {
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

      callback(rolesToDelete, errors);
    });
  };

  public render() {
    const { rolesToDelete, onCancel, intl } = this.props;
    const moreThanOne = rolesToDelete.length > 1;
    const title = intl.formatMessage(
      {
        id: 'xpack.security.management.roles.deleteRoleTitle',
        defaultMessage: 'Delete role{value, plural, one {{roleName}} other {s}}',
      },
      { value: rolesToDelete.length, roleName: ` ${rolesToDelete[0]}` }
    );

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deleteUsers}
          cancelButtonText={intl.formatMessage({
            id: 'xpack.security.management.roles.confirmDelete.cancelButtonLabel',
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={intl.formatMessage({
            id: 'xpack.security.management.roles.deleteRoleConfirmButtonLabel',
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
        >
          <div>
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
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}

export const ConfirmDelete = injectI18n(ConfirmDeleteUI);
