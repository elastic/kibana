/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
export class ConfirmDelete extends Component {
  deleteUsers = () => {
    const { usersToDelete, apiClient, callback } = this.props;
    const errors = [];
    usersToDelete.forEach(async username => {
      try {
        await apiClient.deleteUser(username);
        toastNotifications.addSuccess(`Deleted user ${username}`);
      } catch (e) {
        errors.push(username);
        toastNotifications.addDanger(`Error deleting user ${username}`);
      }
      if (callback) {
        callback(usersToDelete, errors);
      }
    });
  };
  render() {
    const { usersToDelete, onCancel } = this.props;
    const moreThanOne = usersToDelete.length > 1;
    const title = moreThanOne
      ? `Delete ${usersToDelete.length} users`
      : `Delete user '${usersToDelete[0]}'`;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={title}
          onCancel={onCancel}
          onConfirm={this.deleteUsers}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
        >
          <div>
            {moreThanOne ? (
              <Fragment>
                <p>
                  You are about to delete these users:
                </p>
                <ul>{usersToDelete.map(username => <li key={username}>{username}</li>)}</ul>
              </Fragment>
            ) : null}
            <p>This operation cannot be undone.</p>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
}
