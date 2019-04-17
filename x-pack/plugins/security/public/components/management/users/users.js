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
  EuiInMemoryTable,
  EuiPageContent,
  EuiTitle,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { ConfirmDelete } from './confirm_delete';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { UserAPIClient } from '../../../lib/api';

class UsersUI extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      selection: [],
      showDeleteConfirmation: false,
    };
  }
  componentDidMount() {
    this.loadUsers();
  }
  handleDelete = (usernames, errors) => {
    const { users } = this.state;
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
      users: users.filter(({ username }) => {
        return !usernames.includes(username) || errors.includes(username);
      }),
    });
  };
  async loadUsers() {
    try {
      const users = await UserAPIClient.getUsers();
      this.setState({ users });
    } catch (e) {
      if (e.body.statusCode === 403) {
        this.setState({ permissionDenied: true });
      } else {
        toastNotifications.addDanger(
          this.props.intl.formatMessage({
            id: 'xpack.security.management.users.fetchingUsersErrorMessage',
            defaultMessage: 'Error fetching users: {message}'
          }, { message: e.body.message })
        );
      }
    }
  }
  renderToolsLeft() {
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
            numSelected: numSelected,
          }}
        />
      </EuiButton>
    );
  }
  onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  }
  render() {
    const { users, filter, permissionDenied, showDeleteConfirmation, selection } = this.state;
    const { intl } = this.props;
    if (permissionDenied) {
      return (
        <div className="secUsersListingPage">
          <EuiPageContent horizontalPosition="center">
            <EuiEmptyPrompt
              iconType="securityApp"
              iconColor={null}
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.security.management.users.deniedPermissionTitle"
                    defaultMessage="Permission denied"
                  />
                </h2>}
              body={
                <p data-test-subj="permissionDeniedMessage">
                  <FormattedMessage
                    id="xpack.security.management.users.permissionDeniedToManageUsersDescription"
                    defaultMessage="You do not have permission to manage users."
                  />
                </p>}
            />
          </EuiPageContent>
        </div>
      );
    }
    const path = '#/management/security/';
    const columns = [
      {
        field: 'full_name',
        name: intl.formatMessage({ id: 'xpack.security.management.users.fullNameColumnName', defaultMessage: 'Full Name' }),
        sortable: true,
        truncateText: true,
        render: fullName => {
          return <div data-test-subj="userRowFullName">{fullName}</div>;
        },
      },
      {
        field: 'username',
        name: intl.formatMessage({ id: 'xpack.security.management.users.userNameColumnName', defaultMessage: 'User Name' }),
        sortable: true,
        truncateText: true,
        render: username => (
          <EuiLink data-test-subj="userRowUserName" href={`${path}users/edit/${username}`}>
            {username}
          </EuiLink>
        ),
      },
      {
        field: 'email',
        name: intl.formatMessage({
          id: 'xpack.security.management.users.emailAddressColumnName',
          defaultMessage: 'Email Address'
        }),
        sortable: true,
        truncateText: true,
        render: email => {
          return <div data-test-subj="userRowEmail">{email}</div>;
        },
      },
      {
        field: 'roles',
        name: intl.formatMessage({ id: 'xpack.security.management.users.rolesColumnName', defaultMessage: 'Roles' }),
        render: rolenames => {
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
        name: intl.formatMessage({ id: 'xpack.security.management.users.reservedColumnName', defaultMessage: 'Reserved' }),
        sortable: false,
        width: '100px',
        align: 'right',
        description:
          intl.formatMessage({
            id: 'xpack.security.management.users.reservedColumnDescription',
            defaultMessage: 'Reserved users are built-in and cannot be removed. Only the password can be changed.'
          }),
        render: reserved =>
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
      selectable: user => !user.metadata._reserved,
      selectableMessage: selectable => (!selectable ? 'User is a system user' : undefined),
      onSelectionChange: selection => this.setState({ selection }),
    };
    const search = {
      toolsLeft: this.renderToolsLeft(),
      box: {
        incremental: true,
      },
      onChange: query => {
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
      }) : users;
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
              <EuiButton
                data-test-subj="createUserButton"
                href="#/management/security/users/edit"
              >
                <FormattedMessage
                  id="xpack.security.management.users.createNewUserButtonLabel"
                  defaultMessage="Create new user"
                />
              </EuiButton>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>

            {showDeleteConfirmation ? (
              <ConfirmDelete
                onCancel={this.onCancelDelete}
                usersToDelete={selection.map((user) => user.username)}
                callback={this.handleDelete}
              />
            ) : null}

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

          </EuiPageContentBody>
        </EuiPageContent>
      </div>
    );
  }
}

export const Users = injectI18n(UsersUI);
