/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { asyncForEach } from '@kbn/std';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { NotificationsStart } from 'src/core/public';

import type { UserAPIClient } from '../../user_api_client';

interface Props {
  usersToDelete: string[];
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  notifications: NotificationsStart;
  onCancel: () => void;
  callback?: (usersToDelete: string[], errors: string[]) => void;
}

export class ConfirmDeleteUsers extends Component<Props, unknown> {
  public render() {
    const { usersToDelete, onCancel } = this.props;
    const moreThanOne = usersToDelete.length > 1;
    const title = moreThanOne
      ? i18n.translate('xpack.security.management.users.confirmDelete.deleteMultipleUsersTitle', {
          defaultMessage: 'Delete {userLength} users',
          values: { userLength: usersToDelete.length },
        })
      : i18n.translate('xpack.security.management.users.confirmDelete.deleteOneUserTitle', {
          defaultMessage: 'Delete user {userLength}',
          values: { userLength: usersToDelete[0] },
        });
    return (
      <EuiConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={this.deleteUsers}
        cancelButtonText={i18n.translate(
          'xpack.security.management.users.confirmDelete.cancelButtonLabel',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.security.management.users.confirmDelete.confirmButtonLabel',
          { defaultMessage: 'Delete' }
        )}
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
              <ul>
                {usersToDelete.map((username) => (
                  <li key={username}>{username}</li>
                ))}
              </ul>
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
    );
  }

  private deleteUsers = () => {
    const { usersToDelete, callback, userAPIClient, notifications } = this.props;
    const errors: string[] = [];
    asyncForEach(usersToDelete, async (username) => {
      try {
        await userAPIClient.deleteUser(username);
        notifications.toasts.addSuccess(
          i18n.translate(
            'xpack.security.management.users.confirmDelete.userSuccessfullyDeletedNotificationMessage',
            { defaultMessage: 'Deleted user {username}', values: { username } }
          )
        );
      } catch (e) {
        errors.push(username);
        notifications.toasts.addDanger(
          i18n.translate(
            'xpack.security.management.users.confirmDelete.userDeletingErrorNotificationMessage',
            { defaultMessage: 'Error deleting user {username}', values: { username } }
          )
        );
      }
    }).then(() => {
      if (callback) {
        callback(usersToDelete, errors);
      }
    });
  };
}
