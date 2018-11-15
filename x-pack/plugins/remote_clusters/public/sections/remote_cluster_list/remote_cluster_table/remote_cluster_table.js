/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiInMemoryTable,
} from '@elastic/eui';

export class RemoteClusterTableUi extends Component {
  static propTypes = {
    clusters: PropTypes.array,
    closeDetailPanel: PropTypes.func.isRequired,
  }

  static defaultProps = {
    clusters: [],
  }

  constructor(props) {
    super(props);

    this.state = {
      selectedItems: [],
    };
  }

  render() {
    const {
      clusters,
      openDetailPanel,
    } = this.props;

    const { selectedItems } = this.state;

    const columns = [{
      field: 'name',
      name: 'Name',
      sortable: true,
      truncateText: false,
    }, {
      fields: 'seeds',
      name: 'Seeds',
      truncateText: true,
      render: ({ seeds }) => seeds.join(', '),
    }, {
      field: 'connected',
      name: 'Connected',
    }, {
      field: 'num_nodes_connected',
      name: 'Connected nodes',
    }];

    const getRowProps = (item) => {
      const { name } = item;
      return {
        onClick: () => openDetailPanel(name),
      };
    };

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      }
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <EuiButton color="danger">
          Disconnect remote clusters
        </EuiButton>
      ) : undefined,
      box: {
        incremental: true,
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50]
    };

    const selection = {
      onSelectionChange: (selectedItems) => this.setState({ selectedItems })
    };

    return (
      <EuiInMemoryTable
        items={clusters}
        itemId="name"
        columns={columns}
        rowProps={getRowProps}
        search={search}
        pagination={pagination}
        sorting={sorting}
        selection={selection}
        isSelectable={true}
      />
    );
  }
}

export const RemoteClusterTable = injectI18n(RemoteClusterTableUi);
