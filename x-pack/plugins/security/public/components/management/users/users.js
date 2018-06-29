/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { EuiButton, EuiIcon, EuiInMemoryTable, EuiPage } from '@elastic/eui';

export class Users extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      selection: []
    };
  }
  async componentWillMount() {
    const { httpClient } = this.props;
    const path = chrome.addBasePath('/api/security/v1/users');
    const { data } = await httpClient.get(path);
    this.setState({ users: data });
  }
  renderToolsRight() {
    const selection = this.state.selection;

    if (selection.length === 0) {
      return (
        <EuiButton fill iconType="plusInCircle" onClick={onClick}>
          Create user
        </EuiButton>
      );
    }

    const onClick = () => {
      store.deleteUsers(...selection.map(user => user.id));
      this.setState({ selection: [] });
    };
    const numSelected = selection.length;
    return (
      <EuiButton color="danger" iconType="trash" onClick={onClick}>
        Delete {numSelected} user{numSelected > 1 ? "s" : ""}
      </EuiButton>
    );
  }
  render() {
    const { users } = this.state;
    const columns = [
      {
        field: 'full_name',
        name: 'Full Name',
        sortable: true,
        truncateText: true
      },
      {
        field: 'username',
        name: 'User Name',
        sortable: true,
        truncateText: true
      },
      {
        field: 'email',
        name: 'Email',
        sortable: true,
        truncateText: true
      },
      {
        field: 'roles',
        name: 'Roles'
      },
      {
        field: 'metadata._reserved',
        name: 'Reserved',
        sortable: false,
        render: reserved => (reserved ? <EuiIcon type="check" /> : null)
      }
    ];
    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100]
    };

    const selection = {
      itemId: 'username',
      selectable: user => !user.metadata._reserved,
      selectableMessage: selectable =>
        !selectable ? 'User is a system user' : undefined,
      onSelectionChange: selection => this.setState({ selection })
    };
    const search = {
      toolsRight: this.renderToolsRight(),
      box: {
        incremental: true
      }
    };
    const sorting = {
      sort: {
        field: 'full_name',
        direction: 'asc',
      }
    };

    return (
      <EuiPage>
        <EuiInMemoryTable
          columns={columns}
          selection={selection}
          pagination={pagination}
          items={users}
          loading={users.length === 0}
          search={search}
          sorting={sorting}
        />
      </EuiPage>
    );
  }
}
