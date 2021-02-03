/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { getUserDisplayName } from '../../../../common/model';
import { isUserDeprecated, isUserReserved } from '../user_utils';
import { UserForm } from './user_form';
import { ChangePasswordFlyout } from './change_password_flyout';
import { ConfirmDisableUsers } from './confirm_disable_users';
import { ConfirmEnableUsers } from './confirm_enable_users';
import { ConfirmDeleteUsers } from './confirm_delete_users';
import { UserAPIClient } from '..';

export interface EditUserPageProps {
  username: string;
}

export type EditUserPageAction =
  | 'changePassword'
  | 'disableUser'
  | 'enableUser'
  | 'deleteUser'
  | 'none';

export const EditUserPage: FunctionComponent<EditUserPageProps> = ({ username }) => {
  const { services } = useKibana();
  const history = useHistory();
  const [{ value: user, error }, getUser] = useAsyncFn(
    () => new UserAPIClient(services.http!).getUser(username),
    [services.http]
  );
  const [action, setAction] = useState<EditUserPageAction>('none');

  const backToUsers = () => history.push('/');

  useEffect(() => {
    getUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) {
      backToUsers();
    }
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return null;
  }

  const isReservedUser = isUserReserved(user);
  const isDeprecatedUser = isUserDeprecated(user);
  const displayName = getUserDisplayName(user);

  return (
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiAvatar name={displayName!} size="xl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h1>{displayName}</h1>
              </EuiTitle>
              <EuiText>{user.email}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiHorizontalRule />
        {isDeprecatedUser ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.security.management.users.editUserPage.deprecatedUserWarning"
                  defaultMessage="This user is deprecated."
                />
              }
              iconType="alert"
              color="warning"
            >
              {user.metadata?._deprecated_reason?.replace(/\[(.+)\]/, "'$1'")}
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : isReservedUser ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.security.management.users.editUserPage.reservedUserWarning"
                  defaultMessage="This user is built in and can't be updated or deleted."
                />
              }
              iconType="lock"
            />
            <EuiSpacer />
          </>
        ) : user.enabled === false ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.security.management.users.editUserPage.disabledUserWarning"
                  defaultMessage="This user has been deactivated and can't access Elastic."
                />
              }
            >
              <EuiButton onClick={() => setAction('enableUser')} size="s">
                <FormattedMessage
                  id="xpack.security.management.users.editUserPage.enableUserButton"
                  defaultMessage="Activate user"
                />
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : undefined}

        <UserForm
          isReservedUser={isReservedUser}
          defaultValues={user}
          onCancel={backToUsers}
          onSuccess={backToUsers}
        />

        {action === 'changePassword' ? (
          <ChangePasswordFlyout
            username={username!}
            onCancel={() => setAction('none')}
            onSuccess={() => setAction('none')}
          />
        ) : action === 'disableUser' ? (
          <ConfirmDisableUsers
            usernames={[username!]}
            onCancel={() => setAction('none')}
            onSuccess={() => {
              setAction('none');
              getUser();
            }}
          />
        ) : action === 'enableUser' ? (
          <ConfirmEnableUsers
            usernames={[username!]}
            onCancel={() => setAction('none')}
            onSuccess={() => {
              setAction('none');
              getUser();
            }}
          />
        ) : action === 'deleteUser' ? (
          <ConfirmDeleteUsers
            usernames={[username!]}
            onCancel={() => setAction('none')}
            onSuccess={backToUsers}
          />
        ) : undefined}

        <EuiSpacer />
        <EuiHorizontalRule />

        <EuiPanel color="subdued" hasShadow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <EuiDescriptionList>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.security.management.users.editUserPage.changePasswordTitle"
                    defaultMessage="Change password"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <FormattedMessage
                    id="xpack.security.management.users.editUserPage.changePasswordDescription"
                    defaultMessage="The user will not be able to log in using their previous
                    password."
                  />
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => setAction('changePassword')} size="s">
                <FormattedMessage
                  id="xpack.security.management.users.editUserPage.changePasswordButton"
                  defaultMessage="Change password"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer />
        {user.enabled === false ? (
          <EuiPanel color="subdued" hasShadow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiDescriptionList>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.security.management.users.editUserPage.enableUserTitle"
                      defaultMessage="Activate user"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    <FormattedMessage
                      id="xpack.security.management.users.editUserPage.enableUserDescription"
                      defaultMessage="Allow the user to access Elastic."
                    />
                  </EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setAction('enableUser')} size="s">
                  <FormattedMessage
                    id="xpack.security.management.users.editUserPage.enableUserButton"
                    defaultMessage="Activate user"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ) : (
          <EuiPanel color="subdued" hasShadow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiDescriptionList>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.security.management.users.editUserPage.disableUserTitle"
                      defaultMessage="Deactivate user"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    <FormattedMessage
                      id="xpack.security.management.users.editUserPage.disableUserDescription"
                      defaultMessage="Prevent the user from accessing Elastic."
                    />
                  </EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setAction('disableUser')} size="s">
                  <FormattedMessage
                    id="xpack.security.management.users.editUserPage.disableUserButton"
                    defaultMessage="Deactivate user"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}

        {!isReservedUser && (
          <>
            <EuiSpacer />
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem>
                  <EuiDescriptionList>
                    <EuiDescriptionListTitle>
                      <FormattedMessage
                        id="xpack.security.management.users.editUserPage.deleteUserTitle"
                        defaultMessage="Delete user"
                      />
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <FormattedMessage
                        id="xpack.security.management.users.editUserPage.deleteUserDescription"
                        defaultMessage="Permanently delete the user and remove access to Elastic."
                      />
                    </EuiDescriptionListDescription>
                  </EuiDescriptionList>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => setAction('deleteUser')} size="s" color="danger">
                    <FormattedMessage
                      id="xpack.security.management.users.editUserPage.deleteUserButton"
                      defaultMessage="Delete user"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
      </EuiPageContentBody>
    </EuiPageContent>
  );
};
