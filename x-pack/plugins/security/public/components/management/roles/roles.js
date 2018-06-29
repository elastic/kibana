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
export class Roles extends Component {
  constructor(props) {
    super(props);
    this.state = {
      roles: [],
      selection: []
    };
  }
  async componentWillMount() {
    const { httpClient } = this.props;
    const path = chrome.addBasePath('/api/security/v1/roles');
    const { data } = await httpClient.get(path);
    this.setState({ roles: data });
  }
  renderToolsRight() {
    const selection = this.state.selection;

    if (selection.length === 0) {
      return (
        <EuiButton fill iconType="plusInCircle" onClick={onClick}>
          Create role
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
        Delete {numSelected} role{numSelected > 1 ? "s" : ""}
      </EuiButton>
    );
  }
  render() {
    const { roles } = this.state;
    const columns = [
      {
        field: 'name',
        name: 'Role',
        sortable: true,
        truncateText: true
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
      itemId: 'name',
      selectable: role => !role.metadata._reserved,
      selectableMessage: selectable =>
        !selectable ? 'Role is a system role' : undefined,
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
        field: 'name',
        direction: 'asc',
      }
    };

    return (
      <EuiPage>
        <EuiInMemoryTable
          columns={columns}
          selection={selection}
          pagination={pagination}
          items={roles}
          loading={roles.length === 0}
          search={search}
          sorting={sorting}
        />
      </EuiPage>
    );
  }
}
