/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ConfirmModal } from '../../../components/confirm_modal';
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
    <ConfirmModal
      title={i18n.translate('xpack.security.management.users.confirmDeleteUsers.title', {
        defaultMessage: "Delete {count, plural, one{user '{username}'} other{{count} users}}?",
        values: { count: usernames.length, username: usernames[0] },
      })}
      onCancel={onCancel}
      onConfirm={deleteUsers}
      confirmButtonText={i18n.translate(
        'xpack.security.management.users.confirmDeleteUsers.confirmButton',
        {
          defaultMessage:
            '{isLoading, select, true{Deleting {count, plural, one{user} other{users}}…} other{Delete {count, plural, one{user} other{users}}}}',
          values: { count: usernames.length, isLoading: state.loading },
        }
      )}
      confirmButtonColor="danger"
      isLoading={state.loading}
      ownFocus
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
    </ConfirmModal>
  );
};
