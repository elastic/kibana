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
            defaultMessage: "Disabled user '{username}'",
            values: { username },
          })
        );
        onSuccess?.();
      } catch (error) {
        services.notifications!.toasts.addDanger({
          title: i18n.translate(
            'xpack.security.management.users.confirmDisableUsers.errorMessage',
            {
              defaultMessage: "Could not disable user '{username}'",
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
        defaultMessage: "Disable {count, plural, one{user '{username}'} other{{count} users}}?",
        values: { count: usernames.length, username: usernames[0] },
      })}
      onCancel={onCancel}
      onConfirm={disableUsers}
      confirmButtonText={
        isSystemUser
          ? i18n.translate(
              'xpack.security.management.users.changePasswordFlyout.confirmSystemPasswordButton',
              {
                defaultMessage:
                  '{isLoading, select, true{Disabling user…} other{I understand, disable this user}}',
                values: { isLoading: state.loading },
              }
            )
          : i18n.translate('xpack.security.management.users.confirmDisableUsers.confirmButton', {
              defaultMessage:
                '{isLoading, select, true{Disabling {count, plural, one{user} other{users}}…} other{Disable {count, plural, one{user} other{users}}}}',
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
              id="xpack.security.management.users.changePasswordFlyout.systemUserDescription"
              defaultMessage="Disabling this user will prevent Kibana from communicating with Elasticsearch."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.users.changePasswordFlyout.systemUserDescription"
              defaultMessage="Once disabled, you must manually update your config file with credentials for a different system user and restart Kibana."
            />
          </p>
        </EuiText>
      ) : (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.security.management.users.confirmDisableUsers.description"
              defaultMessage="This action will prevent {count, plural, one{the user} other{these users}} from accessing the stack{count, plural, one{.} other{:}}"
              values={{ count: usernames.length, username: <strong>{usernames[0]}</strong> }}
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
