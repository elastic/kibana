/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiIcon,
} from '@elastic/eui';
import { formatMetric } from '../../../lib/format_number';

export class Ccr extends Component {
  constructor(props) {
    super(props);
    this.state = {
      itemIdToExpandedRowMap: {},
    };
  }

  toggleShards(index, shards) {
    const itemIdToExpandedRowMap = {
      ...this.state.itemIdToExpandedRowMap
    };

    if (itemIdToExpandedRowMap[index]) {
      delete itemIdToExpandedRowMap[index];
    } else {
      itemIdToExpandedRowMap[index] = (
        <EuiInMemoryTable
          items={shards}
          columns={[
            {
              field: 'shardId',
              name: 'Shard',
              render: shardId => {
                return (
                  <EuiLink href={`#/elasticsearch/ccr/${index}/shard/${shardId}`}>
                    {shardId}
                  </EuiLink>
                );
              }
            },
            {
              field: 'follows',
              name: 'Follows'
            },
            {
              field: 'opsSynced',
              name: 'Ops synced'
            },
            {
              field: 'syncLagTime',
              name: 'Last fetch time (ms)',
              render: syncLagTime => <span>{formatMetric(syncLagTime, 'time_since')} ago</span>
            },
            {
              field: 'syncLagOps',
              name: 'Sync Lag (ops)',
            },
            {
              field: 'error',
              name: 'Error',
            }
          ]}
          sorting={true}
          pagination={true}
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  }

  renderTable() {
    const { data } = this.props;
    const items = data;

    const pagination = {
      initialPageSize: 5,
      pageSizeOptions: [5, 10, 20]
    };

    const sorting = {
      sort: {
        field: 'index',
        direction: 'asc',
      },
    };


    return (
      <EuiInMemoryTable
        columns={[
          {
            field: 'index',
            name: 'Index',
            sortable: true,
            render: (index, { shards }) => {
              const expanded = !!this.state.itemIdToExpandedRowMap[index];
              return (
                <EuiLink onClick={() => this.toggleShards(index, shards)}>
                  {index}
                  &nbsp;
                  { expanded ? <EuiIcon type="arrowUp" /> : <EuiIcon type="arrowDown" /> }
                </EuiLink>
              );
            }
          },
          {
            field: 'follows',
            sortable: true,
            name: 'Follows'
          },
          {
            field: 'opsSynced',
            sortable: true,
            name: 'Ops synced'
          },
          {
            field: 'syncLagTime',
            sortable: true,
            name: 'Last fetch time (ms)',
            render: syncLagTime => <span>{formatMetric(syncLagTime, 'time_since')} ago</span>
          },
          {
            field: 'syncLagOps',
            sortable: true,
            name: 'Sync Lag (ops)'
          },
          {
            field: 'error',
            sortable: true,
            name: 'Error'
          }
        ]}
        items={items}
        pagination={pagination}
        sorting={sorting}
        itemId="id"
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
      />
    );
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              {this.renderTable()}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
