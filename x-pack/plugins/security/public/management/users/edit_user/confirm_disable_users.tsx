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

export interface ConfirmDisableUsersProps {
  usernames: string[];
  onCancel(): void;
  onSuccess?(): void;
}

export const ConfirmDisableUsers: FunctionComponent<ConfirmDisableUsersProps> = ({
  usernames,
  onCancel,
  onSuccess,
}) => {
  const { services } = useKibana();
  const isSystemUser = usernames[0] === 'kibana' || usernames[0] === 'kibana_system';

  const [state, disableUsers] = useAsyncFn(async () => {
    for (const username of usernames) {
      try {
        await new UserAPIClient(services.http!).disableUser(username);
        services.notifications!.toasts.addSuccess(
          i18n.translate('xpack.security.management.users.confirmDisableUsers.successMessage', {
            defaultMessage: "Deactivated user '{username}'",
            values: { username },
          })
        );
        onSuccess?.();
      } catch (error) {
        services.notifications!.toasts.addDanger({
          title: i18n.translate(
            'xpack.security.management.users.confirmDisableUsers.errorMessage',
            {
              defaultMessage: "Could not deactivate user '{username}'",
              values: { username },
            }
          ),
          text: (error as any).body?.message || error.message,
        });
      }
    }
  }, [services.http]);

  return (
    <ConfirmModal
      title={i18n.translate('xpack.security.management.users.confirmDisableUsers.title', {
        defaultMessage: "Deactivate {count, plural, one{user '{username}'} other{{count} users}}?",
        values: { count: usernames.length, username: usernames[0] },
      })}
      onCancel={onCancel}
      onConfirm={disableUsers}
      confirmButtonText={
        isSystemUser
          ? i18n.translate(
              'xpack.security.management.users.confirmDisableUsers.confirmSystemPasswordButton',
              {
                defaultMessage:
                  '{isLoading, select, true{Deactivating user…} other{I understand, deactivate this user}}',
                values: { isLoading: state.loading },
              }
            )
          : i18n.translate('xpack.security.management.users.confirmDisableUsers.confirmButton', {
              defaultMessage:
                '{isLoading, select, true{Deactivating {count, plural, one{user} other{users}}…} other{Deactivate {count, plural, one{user} other{users}}}}',
              values: { count: usernames.length, isLoading: state.loading },
            })
      }
      confirmButtonColor={isSystemUser ? 'danger' : undefined}
      isLoading={state.loading}
      ownFocus
    >
      {isSystemUser ? (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.security.management.users.confirmDisableUsers.systemUserWarning"
              defaultMessage="Deactivating the system user will prevent Kibana from communicating with Elasticsearch."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.users.confirmDisableUsers.systemUserDescription"
              defaultMessage="Once deactivated, you must manually update your config file with different user details and restart Kibana."
            />
          </p>
        </EuiText>
      ) : (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.security.management.users.confirmDisableUsers.description"
              defaultMessage="{count, plural, one{This user} other{These users}} will no longer be able to access Elastic{count, plural, one{.} other{:}}"
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
        </EuiText>
      )}
    </ConfirmModal>
  );
};
