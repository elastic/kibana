/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiLink,
  EuiInMemoryTable,
} from '@elastic/eui';

import { ConnectionStatus } from '../components';

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

    const { clusters } = props;

    this.state = {
      selectedItems: [],
      searchedClusters: clusters.slice(0),
    };
  }

  onSearch = ({ query }) => {
    const { clusters } = this.props;
    const { text } = query;
    const normalizedSearchText = text.toLowerCase();

    const searchedClusters = clusters.filter(cluster => {
      const { name, seeds } = cluster;
      const normalizedName = name.toLowerCase();
      if (normalizedName.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      return seeds.some(seed => seed.includes(normalizedSearchText));
    });

    this.setState({
      searchedClusters,
    });
  };

  render() {
    const {
      openDetailPanel,
    } = this.props;

    const {
      selectedItems,
      searchedClusters,
    } = this.state;

    const columns = [{
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.nameColumnTitle"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      truncateText: false,
      render: (name) => {
        return (
          <EuiLink onClick={() => openDetailPanel(name)}>
            {name}
          </EuiLink>
        );
      }
    }, {
      field: 'seeds',
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.seedsColumnTitle"
          defaultMessage="Seeds"
        />
      ),
      truncateText: true,
      render: (seeds) => seeds.join(', '),
    }, {
      field: 'connected',
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.connectedColumnTitle"
          defaultMessage="Connected"
        />
      ),
      sortable: true,
      render: (connected) => <ConnectionStatus isConnected={connected} />,
      width: '100px',
    }, {
      field: 'num_nodes_connected',
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.connectedNodesColumnTitle"
          defaultMessage="Connected nodes"
        />
      ),
      sortable: true,
      width: '160px',
    }];

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      }
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <EuiButton color="danger">
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterList.table.disconnectButtonLabel"
            defaultMessage="Disconnect remote clusters"
          />
        </EuiButton>
      ) : undefined,
      onChange: this.onSearch,
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
        items={searchedClusters}
        itemId="name"
        columns={columns}
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
