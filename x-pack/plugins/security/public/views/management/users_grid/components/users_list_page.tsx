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
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import { ConfirmDeleteUsers } from '../../../../components/management/users';
import { User } from '../../../../../common/model';
import { UserAPIClient } from '../../../../lib/api';

interface Props {
  intl: InjectedIntl;
  apiClient: UserAPIClient;
}

interface State {
  users: User[];
  selection: User[];
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  filter: string;
}

class UsersListPageUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      users: [],
      selection: [],
      showDeleteConfirmation: false,
      permissionDenied: false,
      filter: '',
    };
  }

  public componentDidMount() {
    this.loadUsers();
  }

  public render() {
    const { users, filter, permissionDenied, showDeleteConfirmation, selection } = this.state;
    const { intl } = this.props;
    if (permissionDenied) {
      return (
        <EuiFlexGroup gutterSize="none">
          <EuiPageContent horizontalPosition="center">
            <EuiEmptyPrompt
              iconType="securityApp"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.security.management.users.deniedPermissionTitle"
                    defaultMessage="You need permission to manage users"
                  />
                </h2>
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
    const columns = [
      {
        field: 'full_name',
        name: intl.formatMessage({
          id: 'xpack.security.management.users.fullNameColumnName',
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
        name: intl.formatMessage({
          id: 'xpack.security.management.users.userNameColumnName',
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
        name: intl.formatMessage({
          id: 'xpack.security.management.users.emailAddressColumnName',
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
        name: intl.formatMessage({
          id: 'xpack.security.management.users.rolesColumnName',
          defaultMessage: 'Roles',
        }),
        render: (rolenames: string[]) => {
          const roleLinks = rolenames.map((rolename, index) => {
            return (
              <Fragment key={rolename}>
                <EuiLink href={`${path}roles/edit/${rolename}`}>{rolename}</EuiLink>
                {index === rolenames.length - 1 ? null : ', '}
              </Fragment>
            );
          });
          return <div data-test-subj="userRowRoles">{roleLinks}</div>;
        },
      },
      {
        field: 'metadata._reserved',
        name: intl.formatMessage({
          id: 'xpack.security.management.users.reservedColumnName',
          defaultMessage: 'Reserved',
        }),
        sortable: false,
        width: '100px',
        align: 'right',
        description: intl.formatMessage({
          id: 'xpack.security.management.users.reservedColumnDescription',
          defaultMessage:
            'Reserved users are built-in and cannot be removed. Only the password can be changed.',
        }),
        render: (reserved?: boolean) =>
          reserved ? (
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
      selectableMessage: (selectable: boolean) =>
        !selectable ? 'User is a system user' : undefined,
      onSelectionChange: (updatedSelection: User[]) =>
        this.setState({ selection: updatedSelection }),
    };
    const search = {
      toolsLeft: this.renderToolsLeft(),
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
    };
    const rowProps = () => {
      return {
        'data-test-subj': 'userRow',
      };
    };
    const usersToShow = filter
      ? users.filter(({ username, roles, full_name: fullName = '', email = '' }) => {
          const normalized = `${username} ${roles.join(' ')} ${fullName} ${email}`.toLowerCase();
          const normalizedQuery = filter.toLowerCase();
          return normalized.indexOf(normalizedQuery) !== -1;
        })
      : users;
    return (
      <div className="secUsersListingPage">
        <EuiPageContent className="secUsersListingPage__content">
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="xpack.security.management.users.usersTitle"
                    defaultMessage="Users"
                  />
                </h2>
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
              />
            ) : null}

            {
              // @ts-ignore missing responsive from typedef
              <EuiInMemoryTable
                itemId="username"
                columns={columns}
                selection={selectionConfig}
                pagination={pagination}
                items={usersToShow}
                loading={users.length === 0}
                search={search}
                sorting={sorting}
                // @ts-ignore missing responsive from typedef
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
        toastNotifications.addDanger(
          this.props.intl.formatMessage(
            {
              id: 'xpack.security.management.users.fetchingUsersErrorMessage',
              defaultMessage: 'Error fetching users: {message}',
            },
            { message: e.body.message }
          )
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

  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}

export const UsersListPage = injectI18n(UsersListPageUI);
