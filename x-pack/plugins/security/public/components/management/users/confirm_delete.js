/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class ConfirmDeleteUI extends Component {
  deleteUsers = () => {
    const { usersToDelete, apiClient, callback } = this.props;
    const errors = [];
    usersToDelete.forEach(async username => {
      try {
        await apiClient.deleteUser(username);
        toastNotifications.addSuccess(
          this.props.intl.formatMessage({
            id: "xpack.security.management.users.confirmDelete.userSuccessfullyDeletedNotificationMessage",
            defaultMessage: "Deleted user {username}"
          }, { username })
        );
      } catch (e) {
        errors.push(username);
        toastNotifications.addDanger(
          this.props.intl.formatMessage({
            id: "xpack.security.management.users.confirmDelete.userDeletingErrorNotificationMessage",
            defaultMessage: "Error deleting user {username}"
          }, { username })
        );
      }
      if (callback) {
        callback(usersToDelete, errors);
      }
    });
  };
  render() {
    const { usersToDelete, onCancel, intl } = this.props;
    const moreThanOne = usersToDelete.length > 1;
    const title = moreThanOne
      ? intl.formatMessage({
        id: "xpack.security.management.users.confirmDelete.deleteMultipleUsersTitle",
        defaultMessage: "Delete {userLength} users"
      }, { userLength: usersToDelete.length })
      : intl.formatMessage({
        id: "xpack.security.management.users.confirmDelete.deleteOneUserTitle",
        defaultMessage: "Delete user {userLength}"
      }, { userLength: usersToDelete[0] });
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deleteUsers}
          cancelButtonText={intl.formatMessage({
            id: "xpack.security.management.users.confirmDelete.cancelButtonLabel",
            defaultMessage: "Cancel"
          })}
          confirmButtonText={intl.formatMessage({
            id: "xpack.security.management.users.confirmDelete.confirmButtonLabel",
            defaultMessage: "Delete"
          })}
          buttonColor="danger"
        >
          <div>
            {moreThanOne ? (
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.security.management.users.confirmDelete.removingUsersDescription"
                    defaultMessage="You are about to delete these users:"
                  />
                </p>
                <ul>{usersToDelete.map(username => <li key={username}>{username}</li>)}</ul>
              </Fragment>
            ) : null}
            <p>
              <FormattedMessage
                id="xpack.security.management.users.confirmDelete.removingUsersWarningMessage"
                defaultMessage="This operation cannot be undone."
              />
            </p>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}

export const ConfirmDelete = injectI18n(ConfirmDeleteUI);
