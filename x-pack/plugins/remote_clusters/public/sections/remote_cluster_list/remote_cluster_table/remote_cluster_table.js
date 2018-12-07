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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';

import { ConnectionStatus, RemoveClusterButton } from '../components';

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
      render: (name, { isConfiguredByNode }) => {
        const link = (
          <EuiLink onClick={() => openDetailPanel(name)}>
            {name}
          </EuiLink>
        );

        if (isConfiguredByNode) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                {link}
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="alert"
                  color="warning"
                  content={(
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterList.table.isConfiguredByNodeMessage"
                      defaultMessage="Defined in elasticsearch.yml"
                    />
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return link;
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
    }, {
      name: (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.table.actionsColumnTitle"
          defaultMessage="Actions"
        />
      ),
      width: '100px',
      actions: [{
        render: ({ name, isConfiguredByNode }) => {
          const label = i18n.translate('xpack.remoteClusters.remoteClusterList.table.actionEditDescription', {
            defaultMessage: 'Delete remote cluster',
          });

          return (
            <EuiToolTip
              content={isConfiguredByNode ? undefined : label}
              delay="long"
            >
              <RemoveClusterButton clusterNames={[name]}>
                <EuiButtonIcon
                  aria-label={label}
                  iconType="trash"
                  color="danger"
                  isDisabled={isConfiguredByNode}
                />
              </RemoveClusterButton>
            </EuiToolTip>
          );
        },
      }, {
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.actionEditAriaLabel', {
          defaultMessage: 'Edit remote cluster',
        }),
        description: i18n.translate('xpack.remoteClusters.remoteClusterList.table.actionEditDescription', {
          defaultMessage: 'Edit remote cluster',
        }),
        color: 'primary',
        icon: 'pencil',
        type: 'icon',
        onClick: () => {},
        // Implmenet this once EUI supports it.
        // href: `#${CRUD_APP_BASE_PATH}/edit/${name}`,
        enabled: ({ isConfiguredByNode }) => !isConfiguredByNode,
      }],
    }];

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      }
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <RemoveClusterButton
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
