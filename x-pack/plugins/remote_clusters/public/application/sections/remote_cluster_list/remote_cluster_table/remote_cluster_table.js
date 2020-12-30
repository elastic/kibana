/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { UIM_SHOW_DETAILS_CLICK } from '../../../constants';
import { PROXY_MODE } from '../../../../../common/constants';
import { trackUiMetric, METRIC_TYPE, getRouter } from '../../../services';
import { ConnectionStatus, RemoveClusterButtonProvider } from '../components';

const getFilteredClusters = (clusters, queryText) => {
  if (queryText) {
    const normalizedSearchText = queryText.toLowerCase();

    return clusters.filter((cluster) => {
      const { name, seeds } = cluster;
      const normalizedName = name.toLowerCase();
      if (normalizedName.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      return seeds.some((seed) => seed.includes(normalizedSearchText));
    });
  } else {
    return clusters;
  }
};

export class RemoteClusterTable extends Component {
  static propTypes = {
    clusters: PropTypes.array,
    openDetailPanel: PropTypes.func.isRequired,
  };

  static defaultProps = {
    clusters: [],
  };

  static getDerivedStateFromProps(props, state) {
    const { clusters } = props;
    const { prevClusters, queryText } = state;

    // If a remote cluster gets deleted, we need to recreate the cached filtered clusters.
    if (prevClusters !== clusters) {
      return {
        prevClusters: clusters,
        filteredClusters: getFilteredClusters(clusters, queryText),
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      prevClusters: props.clusters,
      selectedItems: [],
      filteredClusters: props.clusters,
      queryText: '',
    };
  }

  onSearch = ({ query }) => {
    const { clusters } = this.props;
    const { text } = query;

    // We cache the filtered indices instead of calculating them inside render() because
    // of https://github.com/elastic/eui/issues/3445.
    this.setState({
      queryText: text,
      filteredClusters: getFilteredClusters(clusters, text),
    });
  };

  render() {
    const { openDetailPanel } = this.props;
    const { selectedItems, filteredClusters } = this.state;
    const { history } = getRouter();

    const columns = [
      {
        field: 'name',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: false,
        render: (name, { isConfiguredByNode, hasDeprecatedProxySetting }) => {
          const link = (
            <EuiLink
              data-test-subj="remoteClustersTableListClusterLink"
              onClick={() => {
                trackUiMetric(METRIC_TYPE.CLICK, UIM_SHOW_DETAILS_CLICK);
                openDetailPanel(name);
              }}
            >
              {name}
            </EuiLink>
          );

          if (isConfiguredByNode) {
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>{link}</EuiFlexItem>

                <EuiFlexItem
                  grow={false}
                  data-test-subj="remoteClustersTableListClusterDefinedByNodeTooltip"
                >
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content={
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterList.table.isConfiguredByNodeMessage"
                        defaultMessage="Defined in elasticsearch.yml"
                      />
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          if (hasDeprecatedProxySetting) {
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem
                  grow={false}
                  data-test-subj="remoteClustersTableListClusterWithDeprecatedSettingTooltip"
                >
                  {link}
                </EuiFlexItem>

                <EuiFlexItem
                  grow={false}
                  data-test-subj="remoteClustersTableListDeprecatedSetttingsTooltip"
                >
                  <EuiIconTip
                    type="alert"
                    color="warning"
                    content={
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterList.table.hasDeprecatedSettingMessage"
                        defaultMessage="Edit this cluster to update the deprecated settings."
                      />
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          return link;
        },
      },
      {
        field: 'isConnected',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.connectedColumnTitle', {
          defaultMessage: 'Status',
        }),
        sortable: true,
        render: (isConnected, { mode }) => (
          <ConnectionStatus isConnected={isConnected} mode={mode} />
        ),
        width: '240px',
      },
      {
        field: 'mode',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.modeColumnTitle', {
          defaultMessage: 'Mode',
        }),
        sortable: true,
        render: (mode) =>
          mode === PROXY_MODE
            ? mode
            : i18n.translate('xpack.remoteClusters.remoteClusterList.table.sniffModeDescription', {
                defaultMessage: 'default',
              }),
      },
      {
        field: 'mode',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.addressesColumnTitle', {
          defaultMessage: 'Addresses',
        }),
        truncateText: true,
        render: (mode, { seeds, proxyAddress }) => {
          if (mode === PROXY_MODE) {
            return proxyAddress;
          }
          return seeds.join(', ');
        },
      },
      {
        field: 'mode',
        name: i18n.translate(
          'xpack.remoteClusters.remoteClusterList.table.connectionsColumnTitle',
          {
            defaultMessage: 'Connections',
          }
        ),
        sortable: true,
        width: '160px',
        render: (mode, { connectedNodesCount, connectedSocketsCount }) => {
          if (mode === PROXY_MODE) {
            return connectedSocketsCount;
          }
          return connectedNodesCount;
        },
      },
      {
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions: [
          {
            render: ({ name, isConfiguredByNode }) => {
              const label = isConfiguredByNode
                ? i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionBlockedEditDescription',
                    {
                      defaultMessage: `Remote clusters defined in elasticsearch.yml can't be edited`,
                    }
                  )
                : i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionEditDescription',
                    {
                      defaultMessage: 'Edit remote cluster',
                    }
                  );

              return (
                <EuiToolTip content={label} delay="long">
                  <EuiButtonIcon
                    data-test-subj="remoteClusterTableRowEditButton"
                    aria-label={label}
                    iconType="pencil"
                    color="primary"
                    isDisabled={isConfiguredByNode}
                    {...reactRouterNavigate(history, `/edit/${name}`)}
                    disabled={isConfiguredByNode}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            render: ({ name, isConfiguredByNode }) => {
              const label = isConfiguredByNode
                ? i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionBlockedDeleteDescription',
                    {
                      defaultMessage: `Remote clusters defined in elasticsearch.yml can't be deleted`,
                    }
                  )
                : i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionDeleteDescription',
                    {
                      defaultMessage: 'Delete remote cluster',
                    }
                  );

              return (
                <EuiToolTip content={label} delay="long">
                  <RemoveClusterButtonProvider clusterNames={[name]}>
                    {(removeCluster) => (
                      <EuiButtonIcon
                        data-test-subj="remoteClusterTableRowRemoveButton"
                        aria-label={label}
                        iconType="trash"
                        color="danger"
                        isDisabled={isConfiguredByNode}
                        onClick={removeCluster}
                      />
                    )}
                  </RemoveClusterButtonProvider>
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ];

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <RemoveClusterButtonProvider clusterNames={selectedItems.map(({ name }) => name)}>
          {(removeCluster) => (
            <EuiButton
              color="danger"
              onClick={removeCluster}
              data-test-subj="remoteClusterBulkDeleteButton"
            >
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.table.removeButtonLabel"
                defaultMessage="Remove {count, plural, one {remote cluster} other {{count} remote clusters}}"
                values={{
                  count: selectedItems.length,
                }}
              />
            </EuiButton>
          )}
        </RemoveClusterButtonProvider>
      ) : undefined,
      onChange: this.onSearch,
      box: {
        incremental: true,
        'data-test-subj': 'remoteClusterSearch',
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (selectedItems) => this.setState({ selectedItems }),
      selectable: ({ isConfiguredByNode }) => !isConfiguredByNode,
    };

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
        data-test-subj="remoteClusterListTable"
      />
    );
  }
}
