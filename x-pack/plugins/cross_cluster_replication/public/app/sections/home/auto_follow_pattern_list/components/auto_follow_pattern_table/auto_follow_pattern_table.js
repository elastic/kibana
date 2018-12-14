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
  EuiInMemoryTable,
  EuiButton,
  EuiButtonIcon,
  EuiToolTip,
  EuiOverlayMask,
  EuiLoadingKibana
} from '@elastic/eui';
import { API_STATUS } from '../../../../../constants';
import { AutoFollowPatternDeleteProvider } from '../../../../../components';
import routing from '../../../../../services/routing';
import { getPrefixSuffixFromFollowPattern } from '../../../../../services/auto_follow_pattern';

export class AutoFollowPatternTableUI extends PureComponent {
  static propTypes = {
    autoFollowPatterns: PropTypes.array,
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

  getFilteredPatterns = () => {
    const { autoFollowPatterns } = this.props;
    const { queryText } = this.state;

    if(queryText) {
      return autoFollowPatterns.filter(autoFollowPattern => {
        const { name, remoteCluster } = autoFollowPattern;

        const inName = name.toLowerCase().includes(queryText);
        const inRemoteCluster = remoteCluster.toLowerCase().includes(queryText);

        return inName || inRemoteCluster;
      });
    }

    return autoFollowPatterns.slice(0);
  };

  getTableColumns() {
    const { intl, selectAutoFollowPattern } = this.props;

    return [{
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.name_column_title"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      truncateText: false,
    }, {
      field: 'remoteCluster',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.cluster_column_title"
          defaultMessage="Cluster"
        />
      ),
      truncateText: true,
      sortable: true,
    }, {
      field: 'leaderIndexPatterns',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.leader_patterns_column_title"
          defaultMessage="Leader patterns"
        />
      ),
      render: (leaderPatterns) => leaderPatterns.join(', '),
    }, {
      field: 'followIndexPattern',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.connected_nodes_column_title"
          defaultMessage="Follower pattern prefix"
        />
      ),
      render: (followIndexPattern) => {
        const { followIndexPatternPrefix } = getPrefixSuffixFromFollowPattern(followIndexPattern);
        return followIndexPatternPrefix;
      }
    }, {
      field: 'followIndexPattern',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.connected_nodes_column_title"
          defaultMessage="Follower pattern suffix"
        />
      ),
      render: (followIndexPattern) => {
        const { followIndexPatternSuffix } = getPrefixSuffixFromFollowPattern(followIndexPattern);
        return followIndexPatternSuffix;
      }
    }, {
      name: '',
      actions: [
        {
          render: ({ name }) => {
            const label = i18n.translate('xpack.crossClusterReplication.autofollowPatternList.table.actionDeleteDescription', {
              defaultMessage: 'Delete auto-follow pattern',
            });

            return (
              <EuiToolTip
                content={label}
                delay="long"
              >
                <AutoFollowPatternDeleteProvider>
                  {(deleteAutoFollowPattern) => (
                    <EuiButtonIcon
                      aria-label={label}
                      iconType="trash"
                      color="danger"
                      onClick={() => deleteAutoFollowPattern(name)}
                    />
                  )}
                </AutoFollowPatternDeleteProvider>
              </EuiToolTip>
            );
          },
        },
        {
          name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.editLabel', defaultMessage: 'Edit' }),
          description: intl.formatMessage({
            id: 'kbn.management.editIndexPattern.fields.table.editDescription', defaultMessage: 'Edit' }),
          icon: 'pencil',
          onClick: ({ name }) => {
            selectAutoFollowPattern(name);
            routing.navigate(encodeURI(`/auto_follow_patterns/edit/${encodeURIComponent(name)}`));
          },
          type: 'icon',
        },
      ],
      width: '40px',
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
  }

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
        <AutoFollowPatternDeleteProvider>
          {(deleteAutoFollowPattern) => (
            <EuiButton
              iconType="trash"
              color="danger"
              onClick={() => deleteAutoFollowPattern(selectedItems.map(({ name }) => name))}
            >
              <FormattedMessage
                id="xpack.cross_cluster_replication.delete_autofollow_pattern_button_label"
                defaultMessage="Delete auto-follow {total, plural, one {pattern} other {patterns}}"
                values={{
                  total: selectedItems.length
                }}
              />
            </EuiButton>
          )}
        </AutoFollowPatternDeleteProvider>
      ) : undefined,
      onChange: this.onSearch,
      box: {
        incremental: true,
      },
    };

    return (
      <Fragment>
        <EuiInMemoryTable
          items={this.getFilteredPatterns()}
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

export const AutoFollowPatternTable = injectI18n(AutoFollowPatternTableUI);
