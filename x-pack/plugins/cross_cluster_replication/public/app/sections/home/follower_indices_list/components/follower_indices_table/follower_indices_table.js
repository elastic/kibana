/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  // EuiLoadingKibana,
  EuiToolTip,
  // EuiOverlayMask,
} from '@elastic/eui';
// import { API_STATUS } from '../../../../../constants';
import { FollowerIndexDeleteProvider } from '../../../../../components';

export const FollowerIndicesTable = injectI18n(
  class extends PureComponent {
    static propTypes = {
      followerIndices: PropTypes.array,
      selectFollowerIndex: PropTypes.func.isRequired,
    }

    state = {
      selectedItems: [],
    }

    onSearch = ({ query }) => {
      const { text } = query;
      const normalizedSearchText = text.toLowerCase();
      this.setState({
        queryText: normalizedSearchText,
      });
    };

    getFilteredIndices = () => {
      const { followerIndices } = this.props;
      const { queryText } = this.state;

      if(queryText) {
        return followerIndices.filter(followerIndex => {
          const { name, shards } = followerIndex;

          const inName = name.toLowerCase().includes(queryText);
          const inRemoteCluster = shards[0].remoteCluster.toLowerCase().includes(queryText);
          const inLeaderIndex = shards[0].leaderIndex.toLowerCase().includes(queryText);

          return inName || inRemoteCluster || inLeaderIndex;
        });
      }

      return followerIndices.slice(0);
    };

    getTableColumns() {
      const { intl, selectFollowerIndex } = this.props;

      return [{
        field: 'name',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.table.nameColumnTitle',
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: false,
        render: (name) => {
          return (
            <EuiLink onClick={() => selectFollowerIndex(name)}>
              {name}
            </EuiLink>
          );
        }
      }, {
        field: 'remoteCluster',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.table.clusterColumnTitle',
          defaultMessage: 'Cluster',
        }),
        truncateText: true,
        sortable: true,
      }, {
        field: 'leaderIndex',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.table.leaderIndexColumnTitle',
          defaultMessage: 'Leader index',
        }),
        truncateText: true,
        sortable: true,
      }, {
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.table.actionsColumnTitle',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: ({ name }) => {
              const label = i18n.translate(
                'xpack.crossClusterReplication.followerIndexList.table.actionDeleteDescription',
                {
                  defaultMessage: 'Delete follower index',
                }
              );

              return (
                <EuiToolTip
                  content={label}
                  delay="long"
                >
                  <FollowerIndexDeleteProvider>
                    {(deleteFollowerIndex) => (
                      <EuiButtonIcon
                        aria-label={label}
                        iconType="trash"
                        color="danger"
                        onClick={() => deleteFollowerIndex(name)}
                      />
                    )}
                  </FollowerIndexDeleteProvider>
                </EuiToolTip>
              );
            },
          }],
        width: '100px',
      }];
    }

    renderLoading = () => {
      // const { apiStatusDelete } = this.props;
      //
      // if (apiStatusDelete === API_STATUS.DELETING) {
      //   return (
      //     <EuiOverlayMask>
      //       <EuiLoadingKibana size="xl"/>
      //     </EuiOverlayMask>
      //   );
      // }
      return null;
    };

    render() {
      const {
        selectedItems,
      } = this.state;

      const sorting = {
        sort: {
          field: 'name',
          direction: 'asc',
        }
      };

      const pagination = {
        initialPageSize: 20,
        pageSizeOptions: [10, 20, 50]
      };

      const selection = {
        onSelectionChange: (selectedItems) => this.setState({ selectedItems })
      };

      const search = {
        toolsLeft: selectedItems.length ? (
          <FollowerIndexDeleteProvider>
            {(deleteFollowerIndex) => (
              <EuiButton
                iconType="trash"
                color="danger"
                onClick={() => deleteFollowerIndex(selectedItems.map(({ name }) => name))}
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.deleteFollowerIndexButtonLabel"
                  defaultMessage="Delete follower {total, plural, one {index} other {indices}}"
                  values={{
                    total: selectedItems.length
                  }}
                />
              </EuiButton>
            )}
          </FollowerIndexDeleteProvider>
        ) : undefined,
        onChange: this.onSearch,
        box: {
          incremental: true,
        },
      };

      return (
        <Fragment>
          <EuiInMemoryTable
            items={this.getFilteredIndices()}
            itemId="name"
            columns={this.getTableColumns()}
            search={search}
            pagination={pagination}
            sorting={sorting}
            selection={selection}
            isSelectable={true}
          />
          {this.renderLoading()}
        </Fragment>
      );
    }
  }
);
