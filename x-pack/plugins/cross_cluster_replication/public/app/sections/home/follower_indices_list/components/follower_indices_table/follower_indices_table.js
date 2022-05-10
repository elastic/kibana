/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiHealth,
  EuiButton,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingLogo,
  EuiOverlayMask,
} from '@elastic/eui';

import { API_STATUS, UIM_FOLLOWER_INDEX_SHOW_DETAILS_CLICK } from '../../../../../constants';
import { FollowerIndexActionsProvider } from '../../../../../components';
import { routing } from '../../../../../services/routing';
import { trackUiMetric } from '../../../../../services/track_ui_metric';
import { ContextMenu } from '../context_menu';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

const actionI18nTexts = {
  pause: i18n.translate(
    'xpack.crossClusterReplication.followerIndexList.table.actionPauseDescription',
    {
      defaultMessage: 'Pause replication',
    }
  ),
  resume: i18n.translate(
    'xpack.crossClusterReplication.followerIndexList.table.actionResumeDescription',
    {
      defaultMessage: 'Resume replication',
    }
  ),
  edit: i18n.translate(
    'xpack.crossClusterReplication.followerIndexList.table.actionEditDescription',
    {
      defaultMessage: 'Edit follower index',
    }
  ),
  unfollow: i18n.translate(
    'xpack.crossClusterReplication.followerIndexList.table.actionUnfollowDescription',
    {
      defaultMessage: 'Unfollow leader index',
    }
  ),
};

const getFilteredIndices = (followerIndices, queryText) => {
  if (queryText) {
    const normalizedSearchText = queryText.toLowerCase();

    return followerIndices.filter((followerIndex) => {
      // default values to avoid undefined errors
      const { name = '', remoteCluster = '', leaderIndex = '' } = followerIndex;

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

  getTableColumns(actionHandlers) {
    const { selectFollowerIndex } = this.props;

    const actions = [
      /* Pause follower index */
      {
        name: actionI18nTexts.pause,
        description: actionI18nTexts.pause,
        icon: 'pause',
        onClick: (item) => actionHandlers.pauseFollowerIndex(item),
        available: (item) => !item.isPaused,
        'data-test-subj': 'pauseButton',
      },
      /* Resume follower index */
      {
        name: actionI18nTexts.resume,
        description: actionI18nTexts.resume,
        icon: 'play',
        onClick: (item) => actionHandlers.resumeFollowerIndex(item.name),
        available: (item) => item.isPaused,
        'data-test-subj': 'resumeButton',
      },
      /* Edit follower index */
      {
        name: actionI18nTexts.edit,
        description: actionI18nTexts.edit,
        onClick: (item) => this.editFollowerIndex(item.name),
        icon: 'pencil',
        'data-test-subj': 'editButton',
      },
      /* Unfollow leader index */
      {
        name: actionI18nTexts.unfollow,
        description: actionI18nTexts.unfollow,
        onClick: (item) => actionHandlers.unfollowLeaderIndex(item.name),
        icon: 'indexFlush',
        'data-test-subj': 'unfollowButton',
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
          <EuiLoadingLogo logo="logoKibana" size="xl" />
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
      toolsRight: (
        <EuiButton
          {...reactRouterNavigate(routing._reactRouter.history, `/follower_indices/add`)}
          fill
          iconType="plusInCircle"
          data-test-subj="createFollowerIndexButton"
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexList.addFollowerButtonLabel"
            defaultMessage="Create a follower index"
          />
        </EuiButton>
      ),
      onChange: this.onSearch,
      box: {
        incremental: true,
        'data-test-subj': 'followerIndexSearch',
      },
    };

    return (
      <FollowerIndexActionsProvider>
        {(getActionHandlers) => {
          const actionHandlers = getActionHandlers();
          return (
            <>
              <EuiInMemoryTable
                items={filteredIndices}
                itemId="name"
                columns={this.getTableColumns(actionHandlers)}
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
            </>
          );
        }}
      </FollowerIndexActionsProvider>
    );
  }
}
