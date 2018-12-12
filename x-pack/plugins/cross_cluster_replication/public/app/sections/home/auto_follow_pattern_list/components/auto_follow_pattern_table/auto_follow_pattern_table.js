/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiButton,
} from '@elastic/eui';
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
          name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.editLabel', defaultMessage: 'Edit' }),
          description: intl.formatMessage({
            id: 'kbn.management.editIndexPattern.fields.table.editDescription', defaultMessage: 'Edit' }),
          icon: 'pencil',
          onClick: ({ name }) => {
            selectAutoFollowPattern(name);
            routing.navigate(`/auto_follow_patterns/edit/${name}`);
          },
          type: 'icon',
        },
      ],
      width: '40px',
    }];
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
              iconType="minusInCircle"
              onClick={() => deleteAutoFollowPattern(selectedItems.map(({ name }) => name))}
            >
              <FormattedMessage
                id="xpack.cross_cluster_replication.delete_autofollow_pattern_button_label"
                defaultMessage="Delete auto-follow pattern"
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
    );
  }
}

export const AutoFollowPatternTable = injectI18n(AutoFollowPatternTableUI);
