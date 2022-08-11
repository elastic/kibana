/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { UserAPIClient } from '..';

export interface ConfirmDeleteUsersProps {
  usernames: string[];
  onCancel(): void;
  onSuccess?(): void;
}

export const ConfirmDeleteUsers: FunctionComponent<ConfirmDeleteUsersProps> = ({
  usernames,
  onCancel,
  onSuccess,
}) => {
  const { services } = useKibana();

  const [state, deleteUsers] = useAsyncFn(async () => {
    for (const username of usernames) {
      try {
        await new UserAPIClient(services.http!).deleteUser(username);
        services.notifications!.toasts.addSuccess(
          i18n.translate('xpack.security.management.users.confirmDeleteUsers.successMessage', {
            defaultMessage: "Deleted user '{username}'",
            values: { username },
          })
        );
        onSuccess?.();
      } catch (error) {
        services.notifications!.toasts.addDanger({
          title: i18n.translate('xpack.security.management.users.confirmDeleteUsers.errorMessage', {
            defaultMessage: "Could not delete user '{username}'",
            values: { username },
          }),
          text: (error as any).body?.message || error.message,
        });
      }
    }
  }, [services.http]);

  return (
    <EuiConfirmModal
      role="dialog"
      title={i18n.translate('xpack.security.management.users.confirmDeleteUsers.title', {
        defaultMessage: "Delete {count, plural, one{user '{username}'} other{{count} users}}?",
        values: { count: usernames.length, username: usernames[0] },
      })}
      onCancel={onCancel}
      onConfirm={deleteUsers}
      cancelButtonText={i18n.translate(
        'xpack.security.management.users.confirmDeleteUsers.cancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.security.management.users.confirmDeleteUsers.confirmButton',
        {
          defaultMessage:
            '{isLoading, select, true{Deleting {count, plural, one{user} other{users}}…} other{Delete {count, plural, one{user} other{users}}}}',
          values: { count: usernames.length, isLoading: state.loading },
        }
      )}
      buttonColor="danger"
      isLoading={state.loading}
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.security.management.users.confirmDeleteUsers.description"
            defaultMessage="{count, plural, one{This user} other{These users}} will be permanently deleted and access to Elastic removed{count, plural, one{.} other{:}}"
            values={{ count: usernames.length }}
          />
        </p>
        {usernames.length > 1 && (
          <ul>
            {usernames.map((username) => (
              <li key={username}>{username}</li>
            ))}
          </ul>
        )}
        <p>
          <FormattedMessage
            id="xpack.security.management.users.confirmDelete.cannotUndoWarning"
            defaultMessage="You can't recover deleted users."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
