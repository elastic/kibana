/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiPageContent,
  EuiTitle,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiEmptyPrompt,
  EuiBasicTableColumn,
  EuiSwitchEvent,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NotificationsStart } from 'src/core/public';
import { User, isDeprecatedRole, Role } from '../../../../common/model';
import { ConfirmDeleteUsers } from '../components';
import { UserAPIClient } from '..';

interface Props {
  apiClient: PublicMethodsOf<UserAPIClient>;
  notifications: NotificationsStart;
}

interface State {
  users: User[];
  roles: Role[];
  selection: User[];
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  filter: string;
  includeReservedUsers: boolean;
}

export class UsersGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      users: [],
      roles: [],
      selection: [],
      showDeleteConfirmation: false,
      permissionDenied: false,
      filter: '',
      includeReservedUsers: true,
    };
  }

  public componentDidMount() {
    this.loadUsers();
  }

  public render() {
    const {
      users,
      roles,
      filter,
      permissionDenied,
      showDeleteConfirmation,
      selection,
    } = this.state;
    if (permissionDenied) {
      return (
        <EuiFlexGroup gutterSize="none">
          <EuiPageContent horizontalPosition="center">
            <EuiEmptyPrompt
              iconType="securityApp"
              title={
                <h1>
                  <FormattedMessage
                    id="xpack.security.management.users.deniedPermissionTitle"
                    defaultMessage="You need permission to manage users"
                  />
                </h1>
              }
              body={
                <p data-test-subj="permissionDeniedMessage">
                  <FormattedMessage
                    id="xpack.security.management.users.permissionDeniedToManageUsersDescription"
                    defaultMessage="Contact your system administrator."
                  />
                </p>
              }
            />
          </EuiPageContent>
        </EuiFlexGroup>
      );
    }
    const path = '#/management/security/';
    const columns: Array<EuiBasicTableColumn<User>> = [
      {
        field: 'full_name',
        name: i18n.translate('xpack.security.management.users.fullNameColumnName', {
          defaultMessage: 'Full Name',
        }),
        sortable: true,
        truncateText: true,
        render: (fullName: string) => {
          return <div data-test-subj="userRowFullName">{fullName}</div>;
        },
      },
      {
        field: 'username',
        name: i18n.translate('xpack.security.management.users.userNameColumnName', {
          defaultMessage: 'User Name',
        }),
        sortable: true,
        truncateText: true,
        render: (username: string) => (
          <EuiLink data-test-subj="userRowUserName" href={`${path}users/edit/${username}`}>
            {username}
          </EuiLink>
        ),
      },
      {
        field: 'email',
        name: i18n.translate('xpack.security.management.users.emailAddressColumnName', {
          defaultMessage: 'Email Address',
        }),
        sortable: true,
        truncateText: true,
        render: (email: string) => {
          return <div data-test-subj="userRowEmail">{email}</div>;
        },
      },
      {
        field: 'roles',
        name: i18n.translate('xpack.security.management.users.rolesColumnName', {
          defaultMessage: 'Roles',
        }),
        render: (rolenames: string[]) => {
          const roleLinks = rolenames.map((rolename, index) => {
            const roleDefinition = roles.find(role => role.name === rolename);
            const isDeprecated =
              rolename === 'kibana_user' || (roleDefinition && isDeprecatedRole(roleDefinition));
            return (
              <Fragment key={rolename}>
                <EuiLink
                  href={`${path}roles/edit/${rolename}`}
                  color={isDeprecated ? 'warning' : 'primary'}
                  title={
                    isDeprecated
                      ? i18n.translate('xpack.security.management.users.deprecatedRoleTitle', {
                          defaultMessage: 'This role is deprecated, and should no longer be used.',
                        })
                      : undefined
                  }
                >
                  {rolename}
                </EuiLink>
                {index === rolenames.length - 1 ? null : ', '}
              </Fragment>
            );
          });
          return <div data-test-subj="userRowRoles">{roleLinks}</div>;
        },
      },
      {
        field: 'metadata',
        name: i18n.translate('xpack.security.management.users.reservedColumnName', {
          defaultMessage: 'Reserved',
        }),
        sortable: ({ metadata }: User) => Boolean(metadata && metadata._reserved),
        width: '100px',
        align: 'right',
        description: i18n.translate('xpack.security.management.users.reservedColumnDescription', {
          defaultMessage:
            'Reserved users are built-in and cannot be removed. Only the password can be changed.',
        }),
        render: (metadata: User['metadata']) =>
          metadata && metadata._reserved ? (
            <EuiIcon aria-label="Reserved user" data-test-subj="reservedUser" type="check" />
          ) : null,
      },
    ];
    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    };

    const selectionConfig = {
      itemId: 'username',
      selectable: (user: User) => !(user.metadata && user.metadata._reserved),
      selectableMessage: (selectable: boolean) => (!selectable ? 'User is a system user' : ''),
      onSelectionChange: (updatedSelection: User[]) =>
        this.setState({ selection: updatedSelection }),
    };
    const search = {
      toolsLeft: this.renderToolsLeft(),
      toolsRight: this.renderToolsRight(),
      box: {
        incremental: true,
      },
      onChange: (query: any) => {
        this.setState({
          filter: query.queryText,
        });
      },
    };
    const sorting = {
      sort: {
        field: 'full_name',
        direction: 'asc',
      },
    } as const;
    const rowProps = () => {
      return {
        'data-test-subj': 'userRow',
      };
    };
    const usersToShow = users.filter(
      ({ username, roles: userRoles, full_name: fullName = '', email = '', metadata = {} }) => {
        const normalized = `${username} ${userRoles.join(' ')} ${fullName} ${email}`.toLowerCase();
        const normalizedQuery = filter.toLowerCase();
        return (
          normalized.indexOf(normalizedQuery) !== -1 &&
          (this.state.includeReservedUsers || !metadata._reserved)
        );
      }
    );

    return (
      <div className="secUsersListingPage">
        <EuiPageContent className="secUsersListingPage__content">
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.security.management.users.usersTitle"
                    defaultMessage="Users"
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiButton data-test-subj="createUserButton" href="#/management/security/users/edit">
                <FormattedMessage
                  id="xpack.security.management.users.createNewUserButtonLabel"
                  defaultMessage="Create user"
                />
              </EuiButton>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            {showDeleteConfirmation ? (
              <ConfirmDeleteUsers
                onCancel={this.onCancelDelete}
                usersToDelete={selection.map(user => user.username)}
                callback={this.handleDelete}
                apiClient={this.props.apiClient}
                notifications={this.props.notifications}
              />
            ) : null}

            {
              <EuiInMemoryTable
                itemId="username"
                columns={columns}
                selection={selectionConfig}
                pagination={pagination}
                items={usersToShow}
                loading={users.length === 0}
                search={search}
                sorting={sorting}
                rowProps={rowProps}
                isSelectable
              />
            }
          </EuiPageContentBody>
        </EuiPageContent>
      </div>
    );
  }

  private handleDelete = (usernames: string[], errors: string[]) => {
    const { users } = this.state;
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
      users: users.filter(({ username }) => {
        return !usernames.includes(username) || errors.includes(username);
      }),
    });
  };

  private async loadUsers() {
    try {
      const users = await this.props.apiClient.getUsers();
      this.setState({ users });
    } catch (e) {
      if (e.body.statusCode === 403) {
        this.setState({ permissionDenied: true });
      } else {
        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.users.fetchingUsersErrorMessage', {
            defaultMessage: 'Error fetching users: {message}',
            values: { message: e.body.message },
          })
        );
      }
    }
  }

  private renderToolsLeft() {
    const { selection } = this.state;
    if (selection.length === 0) {
      return;
    }
    const numSelected = selection.length;
    return (
      <EuiButton
        data-test-subj="deleteUserButton"
        color="danger"
        onClick={() => this.setState({ showDeleteConfirmation: true })}
      >
        <FormattedMessage
          id="xpack.security.management.users.deleteUsersButtonLabel"
          defaultMessage="Delete {numSelected} user{numSelected, plural, one { } other {s}}"
          values={{
            numSelected,
          }}
        />
      </EuiButton>
    );
  }

  private onIncludeReservedUsersChange = (e: EuiSwitchEvent) => {
    this.setState({
      includeReservedUsers: e.target.checked,
    });
  };

  private renderToolsRight() {
    return (
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.security.management.users.showReservedUsersLabel"
            defaultMessage="Show reserved users"
          />
        }
        checked={this.state.includeReservedUsers}
        onChange={this.onIncludeReservedUsersChange}
      />
    );
  }

  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}
