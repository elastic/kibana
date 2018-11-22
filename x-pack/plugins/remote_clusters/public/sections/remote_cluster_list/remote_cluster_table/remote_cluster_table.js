/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiLink,
  EuiInMemoryTable,
} from '@elastic/eui';

import { ConnectionStatus, DisconnectButton } from '../components';

const unselectableMessage = i18n.translate(
  'xpack.remoteClusters.remoteClusterList.table.unselectableMessage',
  { defaultMessage: 'Settings from elasticsearch.yml cannot be deleted' }
);

const sourceValueTransient = i18n.translate(
  'xpack.remoteClusters.remoteClusterList.table.sourceValueTransient',
  { defaultMessage: 'Transient' }
);

const sourceValuePersistent = i18n.translate(
  'xpack.remoteClusters.remoteClusterList.table.sourceValuePersistent',
  { defaultMessage: 'Persistent' }
);

const sourceValueConfiguration = i18n.translate(
  'xpack.remoteClusters.remoteClusterList.table.sourceValueConfiguration',
  { defaultMessage: 'Config file' }
);

export class RemoteClusterTableUi extends Component {
  static propTypes = {
    clusters: PropTypes.array,
    openDetailPanel: PropTypes.func.isRequired,
  }

  static defaultProps = {
    clusters: [],
  }

  constructor(props) {
    super(props);

    this.state = {
      queryText: undefined,
      selectedItems: [],
    };
  }

  onSearch = ({ query }) => {
    const { text } = query;
    const normalizedSearchText = text.toLowerCase();
    this.setState({
      queryText: normalizedSearchText,
    });
  };

  getFilteredClusters = () => {
    const { clusters } = this.props;
    const { queryText } = this.state;

    if(queryText) {
      return clusters.filter(cluster => {
        const { name, seeds } = cluster;
        const normalizedName = name.toLowerCase();
        if (normalizedName.toLowerCase().includes(queryText)) {
          return true;
        }

        return seeds.some(seed => seed.includes(queryText));
      });
    } else {
      return clusters.slice(0);
    }
  };

  render() {
    const {
      openDetailPanel,
    } = this.props;

    const {
      selectedItems,
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
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.sourceColumnTitle"
          defaultMessage="Source"
        />
      ),
      truncateText: true,
      render: (item) => {
        if(item.isTransient) {
          return sourceValueTransient;
        }

        if(item.isPersistent) {
          return sourceValuePersistent;
        }

        return sourceValueConfiguration;
      },
    }, {
      field: 'isConnected',
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.connectedColumnTitle"
          defaultMessage="Connection"
        />
      ),
      sortable: true,
      render: (isConnected) => <ConnectionStatus isConnected={isConnected} />,
      width: '160px',
    }, {
      field: 'connectedNodesCount',
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
        <DisconnectButton
          clusterNames={selectedItems.map(({ name }) => name)}
        />
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
      onSelectionChange: (selectedItems) => this.setState({ selectedItems }),
      selectable: (item) => item.isTransient || item.isPersistent,
      selectableMessage: (selectable) => !selectable ? unselectableMessage : null,
    };

    const filteredClusters = this.getFilteredClusters();

    return (
      <EuiInMemoryTable
        items={filteredClusters}
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
