/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingKibana,
  EuiToolTip,
  EuiOverlayMask,
} from '@elastic/eui';
import { API_STATUS } from '../../../../../constants';
import {
  FollowerIndexPauseProvider,
  FollowerIndexResumeProvider,
  FollowerIndexUnfollowProvider
} from '../../../../../components';
import { ContextMenu } from '../context_menu';

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
        field: 'shards',
        name: intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.table.statusColumnTitle',
          defaultMessage: 'Status',
        }),
        truncateText: true,
        sortable: true,
        render: (shards) => {
          return shards && shards.length ? (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.table.activeStatus"
              defaultMessage="Active"
            />
          ) : (
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.table.pausedStatus"
              defaultMessage="Paused"
            />
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
            render: ({ name, shards }) => {
              const isPaused = !shards || !shards.length;
              const label = isPaused ? (
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.table.actionResumeDescription"
                  defaultMessage="Resume follower index"
                />
              ) : (
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.table.actionPauseDescription"
                  defaultMessage="Pause follower index"
                />
              );

              return isPaused ? (
                <EuiToolTip
                  content={label}
                  delay="long"
                >
                  <FollowerIndexResumeProvider>
                    {(resumeFollowerIndex) => (
                      <EuiButtonIcon
                        aria-label={label}
                        iconType="play"
                        color="primary"
                        onClick={() => resumeFollowerIndex(name)}
                      />
                    )}
                  </FollowerIndexResumeProvider>
                </EuiToolTip>
              ) : (
                <EuiToolTip
                  content={label}
                  delay="long"
                >
                  <FollowerIndexPauseProvider>
                    {(pauseFollowerIndex) => (
                      <EuiButtonIcon
                        aria-label={label}
                        iconType="pause"
                        color="primary"
                        onClick={() => pauseFollowerIndex(name)}
                      />
                    )}
                  </FollowerIndexPauseProvider>
                </EuiToolTip>
              );
            },
          },
          {
            render: ({ name }) => {
              const label = (
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.table.actionUnfollowDescription"
                  defaultMessage="Unfollow leader index"
                />
              );

              return (
                <EuiToolTip
                  content={label}
                  delay="long"
                >
                  <FollowerIndexUnfollowProvider>
                    {(unfollowLeaderIndex) => (
                      <EuiButtonIcon
                        aria-label={label}
                        iconType="indexFlush"
                        color="danger"
                        onClick={() => unfollowLeaderIndex(name)}
                      />
                    )}
                  </FollowerIndexUnfollowProvider>
                </EuiToolTip>
              );
            },
          },
        ],
        width: '100px',
      }];
    }

    renderLoading = () => {
      const { apiStatusDelete } = this.props;

      if (apiStatusDelete === API_STATUS.DELETING) {
        return (
          <EuiOverlayMask>
            <EuiLoadingKibana size="xl"/>
          </EuiOverlayMask>
        );
      }
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
          <ContextMenu
            followerIndices={selectedItems}
          />
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
