/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiIcon,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingKibana,
  EuiOverlayMask,
} from '@elastic/eui';
import { API_STATUS, UIM_FOLLOWER_INDEX_SHOW_DETAILS_CLICK } from '../../../../../constants';
import {
  FollowerIndexPauseProvider,
  FollowerIndexResumeProvider,
  FollowerIndexUnfollowProvider,
} from '../../../../../components';
import { routing } from '../../../../../services/routing';
import { trackUiMetric } from '../../../../../services/track_ui_metric';
import { ContextMenu } from '../context_menu';

const getFilteredIndices = (followerIndices, queryText) => {
  if (queryText) {
    const normalizedSearchText = queryText.toLowerCase();

    return followerIndices.filter((followerIndex) => {
      const { name, remoteCluster, leaderIndex } = followerIndex;

      if (name.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      if (leaderIndex.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      if (remoteCluster.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      return false;
    });
  }

  return followerIndices;
};

export class FollowerIndicesTable extends PureComponent {
  static propTypes = {
    followerIndices: PropTypes.array,
    selectFollowerIndex: PropTypes.func.isRequired,
  };

  static getDerivedStateFromProps(props, state) {
    const { followerIndices } = props;
    const { prevFollowerIndices, queryText } = state;

    // If a follower index gets deleted, we need to recreate the cached filtered follower indices.
    if (prevFollowerIndices !== followerIndices) {
      return {
        prevFollowerIndices: followerIndices,
        filteredIndices: getFilteredIndices(followerIndices, queryText),
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      prevFollowerIndices: props.followerIndices,
      selectedItems: [],
      filteredIndices: props.followerIndices,
      queryText: '',
    };
  }

  onSearch = ({ query }) => {
    const { followerIndices } = this.props;
    const { text } = query;

    // We cache the filtered indices instead of calculating them inside render() because
    // of https://github.com/elastic/eui/issues/3445.
    this.setState({
      queryText: text,
      filteredIndices: getFilteredIndices(followerIndices, text),
    });
  };

  editFollowerIndex = (id) => {
    const uri = routing.getFollowerIndexPath(id);
    routing.navigate(uri);
  };

  getTableColumns() {
    const { selectFollowerIndex } = this.props;

    const actions = [
      /* Pause or resume follower index */
      {
        render: (followerIndex) => {
          const { name, isPaused } = followerIndex;
          const label = isPaused
            ? i18n.translate(
                'xpack.crossClusterReplication.followerIndexList.table.actionResumeDescription',
                {
                  defaultMessage: 'Resume replication',
                }
              )
            : i18n.translate(
                'xpack.crossClusterReplication.followerIndexList.table.actionPauseDescription',
                {
                  defaultMessage: 'Pause replication',
                }
              );

          return isPaused ? (
            <FollowerIndexResumeProvider>
              {(resumeFollowerIndex) => (
                <span onClick={() => resumeFollowerIndex(name)} data-test-subj="resumeButton">
                  <EuiIcon aria-label={label} type="play" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexResumeProvider>
          ) : (
            <FollowerIndexPauseProvider>
              {(pauseFollowerIndex) => (
                <span
                  onClick={() => pauseFollowerIndex(followerIndex)}
                  data-test-subj="pauseButton"
                >
                  <EuiIcon aria-label={label} type="pause" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexPauseProvider>
          );
        },
      },
      /* Edit follower index */
      {
        render: ({ name }) => {
          const label = i18n.translate(
            'xpack.crossClusterReplication.followerIndexList.table.actionEditDescription',
            {
              defaultMessage: 'Edit follower index',
            }
          );

          return (
            <span onClick={() => this.editFollowerIndex(name)} data-test-subj="editButton">
              <EuiIcon aria-label={label} type="pencil" className="euiContextMenu__icon" />
              <span>{label}</span>
            </span>
          );
        },
      },
      /* Unfollow leader index */
      {
        render: ({ name }) => {
          const label = i18n.translate(
            'xpack.crossClusterReplication.followerIndexList.table.actionUnfollowDescription',
            {
              defaultMessage: 'Unfollow leader index',
            }
          );

          return (
            <FollowerIndexUnfollowProvider>
              {(unfollowLeaderIndex) => (
                <span onClick={() => unfollowLeaderIndex(name)} data-test-subj="unfollowButton">
                  <EuiIcon aria-label={label} type="indexFlush" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexUnfollowProvider>
          );
        },
      },
    ];

    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.nameColumnTitle',
          {
            defaultMessage: 'Name',
          }
        ),
        sortable: true,
        truncateText: false,
        render: (name) => {
          return (
            <EuiLink
              onClick={() => {
                trackUiMetric('click', UIM_FOLLOWER_INDEX_SHOW_DETAILS_CLICK);
                selectFollowerIndex(name);
              }}
              data-test-subj="followerIndexLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'isPaused',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.statusColumnTitle',
          {
            defaultMessage: 'Status',
          }
        ),
        truncateText: true,
        sortable: true,
        render: (isPaused) => {
          return isPaused ? (
            <EuiHealth color="subdued">
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.table.statusColumn.pausedLabel"
                defaultMessage="Paused"
              />
            </EuiHealth>
          ) : (
            <EuiHealth color="success">
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.table.statusColumn.activeLabel"
                defaultMessage="Active"
              />
            </EuiHealth>
          );
        },
      },
      {
        field: 'remoteCluster',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.clusterColumnTitle',
          {
            defaultMessage: 'Remote cluster',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'leaderIndex',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.leaderIndexColumnTitle',
          {
            defaultMessage: 'Leader index',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions,
        width: '100px',
      },
    ];
  }

  renderLoading = () => {
    const { apiStatusDelete } = this.props;

    if (apiStatusDelete === API_STATUS.DELETING) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl" />
        </EuiOverlayMask>
      );
    }
    return null;
  };

  render() {
    const { selectedItems, filteredIndices } = this.state;

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (newSelectedItems) => this.setState({ selectedItems: newSelectedItems }),
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <ContextMenu followerIndices={selectedItems} testSubj="contextMenuButton" />
      ) : undefined,
      onChange: this.onSearch,
      box: {
        incremental: true,
        'data-test-subj': 'followerIndexSearch',
      },
    };

    return (
      <Fragment>
        <EuiInMemoryTable
          items={filteredIndices}
          itemId="name"
          columns={this.getTableColumns()}
          search={search}
          pagination={pagination}
          sorting={sorting}
          selection={selection}
          isSelectable={true}
          rowProps={() => ({
            'data-test-subj': 'row',
          })}
          cellProps={(item, column) => ({
            'data-test-subj': `cell-${column.field}`,
          })}
          data-test-subj="followerIndexListTable"
        />
        {this.renderLoading()}
      </Fragment>
    );
  }
}
