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
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiHealth,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { API_STATUS, UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK } from '../../../../../constants';
import {
  AutoFollowPatternDeleteProvider,
  AutoFollowPatternActionMenu,
} from '../../../../../components';
import { routing } from '../../../../../services/routing';
import { trackUiMetric } from '../../../../../services/track_ui_metric';

const actionI18nTexts = {
  pause: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionPauseDescription',
    {
      defaultMessage: 'Pause replication',
    }
  ),
  resume: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionResumeDescription',
    {
      defaultMessage: 'Resume replication',
    }
  ),
  edit: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionEditDescription',
    {
      defaultMessage: 'Edit auto-follow pattern',
    }
  ),
  delete: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionDeleteDescription',
    {
      defaultMessage: 'Delete auto-follow pattern',
    }
  ),
};

const getFilteredPatterns = (autoFollowPatterns, queryText) => {
  if (queryText) {
    const normalizedSearchText = queryText.toLowerCase();

    return autoFollowPatterns.filter((autoFollowPattern) => {
      // default values to avoid undefined errors
      const {
        name = '',
        remoteCluster = '',
        followIndexPatternPrefix = '',
        followIndexPatternSuffix = '',
      } = autoFollowPattern;

      const inName = name.toLowerCase().includes(normalizedSearchText);
      const inRemoteCluster = remoteCluster.toLowerCase().includes(normalizedSearchText);
      const inPrefix = followIndexPatternPrefix.toLowerCase().includes(normalizedSearchText);
      const inSuffix = followIndexPatternSuffix.toLowerCase().includes(normalizedSearchText);

      return inName || inRemoteCluster || inPrefix || inSuffix;
    });
  }

  return autoFollowPatterns;
};

export class AutoFollowPatternTable extends PureComponent {
  static propTypes = {
    autoFollowPatterns: PropTypes.array,
    selectAutoFollowPattern: PropTypes.func.isRequired,
    pauseAutoFollowPattern: PropTypes.func.isRequired,
    resumeAutoFollowPattern: PropTypes.func.isRequired,
  };

  static getDerivedStateFromProps(props, state) {
    const { autoFollowPatterns } = props;
    const { prevAutoFollowPatterns, queryText } = state;

    // If an auto-follow pattern gets deleted, we need to recreate the cached filtered auto-follow patterns.
    if (prevAutoFollowPatterns !== autoFollowPatterns) {
      return {
        prevAutoFollowPatterns: autoFollowPatterns,
        filteredAutoFollowPatterns: getFilteredPatterns(autoFollowPatterns, queryText),
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      prevAutoFollowPatterns: props.autoFollowPatterns,
      selectedItems: [],
      filteredAutoFollowPatterns: props.autoFollowPatterns,
      queryText: '',
    };
  }

  onSearch = ({ query }) => {
    const { autoFollowPatterns } = this.props;
    const { text } = query;

    // We cache the filtered indices instead of calculating them inside render() because
    // of https://github.com/elastic/eui/issues/3445.
    this.setState({
      queryText: text,
      filteredAutoFollowPatterns: getFilteredPatterns(autoFollowPatterns, text),
    });
  };

  getTableColumns(deleteAutoFollowPattern) {
    const { selectAutoFollowPattern } = this.props;

    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.nameColumnTitle',
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
                trackUiMetric('click', UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK);
                selectAutoFollowPattern(name);
              }}
              data-test-subj="autoFollowPatternLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'active',
        dataType: 'boolean',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.statusTitle',
          {
            defaultMessage: 'Status',
          }
        ),
        render: (active) => {
          const statusText = active
            ? i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextActive',
                { defaultMessage: 'Active' }
              )
            : i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextPaused',
                { defaultMessage: 'Paused' }
              );

          return (
            <>
              <EuiHealth color={active ? 'success' : 'subdued'} />
              &nbsp;{statusText}
            </>
          );
        },
        sortable: true,
      },
      {
        field: 'remoteCluster',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.clusterColumnTitle',
          {
            defaultMessage: 'Remote cluster',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'leaderIndexPatterns',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.leaderPatternsColumnTitle',
          {
            defaultMessage: 'Leader patterns',
          }
        ),
        render: (leaderIndexPatterns) => leaderIndexPatterns.join(', '),
      },
      {
        field: 'followIndexPatternPrefix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.prefixColumnTitle',
          {
            defaultMessage: 'Follower index prefix',
          }
        ),
        sortable: true,
      },
      {
        field: 'followIndexPatternSuffix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.suffixColumnTitle',
          {
            defaultMessage: 'Follower index suffix',
          }
        ),
        sortable: true,
      },
      {
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            name: actionI18nTexts.pause,
            description: actionI18nTexts.pause,
            icon: 'pause',
            onClick: (item) => this.props.pauseAutoFollowPattern(item.name),
            available: (item) => item.active,
            'data-test-subj': 'contextMenuPauseButton',
          },
          {
            name: actionI18nTexts.resume,
            description: actionI18nTexts.resume,
            icon: 'play',
            onClick: (item) => this.props.resumeAutoFollowPattern(item.name),
            available: (item) => !item.active,
            'data-test-subj': 'contextMenuResumeButton',
          },
          {
            name: actionI18nTexts.edit,
            description: actionI18nTexts.edit,
            icon: 'pencil',
            onClick: (item) => routing.navigate(routing.getAutoFollowPatternPath(item.name)),
            'data-test-subj': 'contextMenuEditButton',
          },
          {
            name: actionI18nTexts.delete,
            description: actionI18nTexts.delete,
            icon: 'trash',
            onClick: (item) => deleteAutoFollowPattern(item.name),
            'data-test-subj': 'contextMenuDeleteButton',
          },
        ],
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
    const { selectedItems, filteredAutoFollowPatterns } = this.state;

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
      onSelectionChange: (selectedItems) =>
        this.setState({ selectedItems: selectedItems.map(({ name }) => name) }),
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <AutoFollowPatternActionMenu
          arrowDirection="down"
          patterns={this.state.selectedItems.map((name) =>
            filteredAutoFollowPatterns.find((item) => item.name === name)
          )}
        />
      ) : undefined,
      toolsRight: (
        <EuiButton
          {...reactRouterNavigate(routing._reactRouter.history, `/auto_follow_patterns/add`)}
          fill
          iconType="plusInCircle"
          data-test-subj="createAutoFollowPatternButton"
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternList.addAutoFollowPatternButtonLabel"
            defaultMessage="Create an auto-follow pattern"
          />
        </EuiButton>
      ),
      onChange: this.onSearch,
      box: {
        incremental: true,
        'data-test-subj': 'autoFollowPatternSearch',
      },
    };

    return (
      <AutoFollowPatternDeleteProvider>
        {(deleteAutoFollowPattern) => (
          <>
            <EuiInMemoryTable
              items={filteredAutoFollowPatterns}
              itemId="name"
              columns={this.getTableColumns(deleteAutoFollowPattern)}
              search={search}
              pagination={pagination}
              sorting={sorting}
              selection={selection}
              isSelectable={true}
              rowProps={() => ({
                'data-test-subj': 'row',
              })}
              cellProps={(item, column) => ({
                'data-test-subj': `cell_${column.field}`,
              })}
              data-test-subj="autoFollowPatternListTable"
            />
            {this.renderLoading()}
          </>
        )}
      </AutoFollowPatternDeleteProvider>
    );
  }
}
