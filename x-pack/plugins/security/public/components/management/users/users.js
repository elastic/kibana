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
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { ConfirmDelete } from './confirm_delete';

export class Users extends Component {
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
    const { apiClient } = this.props;
    try {
      const users = await apiClient.getUsers();
      this.setState({ users });
    } catch (e) {
      if (e.status === 403) {
        this.setState({ permissionDenied: true });
      } else {
        toastNotifications.addDanger(`Error fetching users: ${e.data.message}`);
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
        Delete {numSelected} user{numSelected > 1 ? 's' : ''}
      </EuiButton>
    );
  }
  onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  }
  render() {
    const { users, filter, permissionDenied, showDeleteConfirmation, selection } = this.state;
    const { apiClient } = this.props;
    if (permissionDenied) {
      return (
        <EuiPage className="mgtUsersListingPage">
          <EuiPageBody>
            <EuiPageContent horizontalPosition="center">
              <EuiEmptyPrompt
                iconType="securityApp"
                iconColor={null}
                title={<h2>Permission denied</h2>}
                body={<p data-test-subj="permissionDeniedMessage">You do not have permission to manage users.</p>}
              />
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      );
    }
    const path = '#/management/security/';
    const columns = [
      {
        field: 'full_name',
        name: 'Full Name',
        sortable: true,
        truncateText: true,
        render: fullName => {
          return <div data-test-subj="userRowFullName">{fullName}</div>;
        },
      },
      {
        field: 'username',
        name: 'User Name',
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
        name: 'Email Address',
        sortable: true,
        truncateText: true,
      },
      {
        field: 'roles',
        name: 'Roles',
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
        name: 'Reserved',
        sortable: false,
        width: '100px',
        align: 'right',
        description:
          'Reserved users are built-in and cannot be removed. Only the password can be changed.',
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
      <EuiPage className="mgtUsersListingPage">
        <EuiPageBody>
          <EuiPageContent className="mgtUsersListingPage__content">
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h2>Users</h2>
                </EuiTitle>
              </EuiPageContentHeaderSection>
              <EuiPageContentHeaderSection>
                <EuiButton
                  data-test-subj="createUserButton"
                  href="#/management/security/users/edit"
                >
                  Create new user
                </EuiButton>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>

              {showDeleteConfirmation ? (
                <ConfirmDelete
                  onCancel={this.onCancelDelete}
                  apiClient={apiClient}
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
        </EuiPageBody>
      </EuiPage>
    );
  }
}
