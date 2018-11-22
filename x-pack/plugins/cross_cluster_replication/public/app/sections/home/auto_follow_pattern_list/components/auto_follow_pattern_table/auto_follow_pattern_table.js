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
        const { __id__, remote_cluster } = autoFollowPattern; // eslint-disable-line camelcase

        if (__id__.toLowerCase().toLowerCase().includes(queryText)) {
          return true;
        }

        if (remote_cluster.toLowerCase().toLowerCase().includes(queryText)) {
          return true;
        }

        return false;
      });
    }

    return autoFollowPatterns.slice(0);
  };

  getTableColumns() {
    const editField = () => {
      console.log('Coming soon!');
    };

    const { intl } = this.props;

    return [{
      field: '__id__',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.name_column_title"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      truncateText: false,
    }, {
      field: 'remote_cluster',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.cluster_column_title"
          defaultMessage="Cluster"
        />
      ),
      truncateText: true,
      sortable: true,
    }, {
      field: 'leader_index_patterns',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.leader_patterns_column_title"
          defaultMessage="Leader patterns"
        />
      ),
      render: (leaderPatterns) => leaderPatterns.join(', '),
    }, {
      field: 'follow_index_pattern',
      name: (
        <FormattedMessage
          id="xpack.cross_cluster_replication.autofollow_pattern_list.table.connected_nodes_column_title"
          defaultMessage="Follower pattern"
        />
      ),
    }, {
      name: '',
      actions: [
        {
          name: intl.formatMessage({ id: 'kbn.management.editIndexPattern.fields.table.editLabel', defaultMessage: 'Edit' }),
          description: intl.formatMessage({
            id: 'kbn.management.editIndexPattern.fields.table.editDescription', defaultMessage: 'Edit' }),
          icon: 'pencil',
          onClick: editField,
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
        field: '__id__',
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
        <EuiButton
          iconType="minusInCircle"
        >
          <FormattedMessage
            id="xpack.cross_cluster_replication.delete_autofollow_pattern_button_label"
            defaultMessage="Delete auto-follow pattern"
          />
        </EuiButton>
      ) : undefined,
      onChange: this.onSearch,
      box: {
        incremental: true,
      },
    };

    return (
      <EuiInMemoryTable
        items={this.getFilteredPatterns()}
        itemId="__id__"
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
