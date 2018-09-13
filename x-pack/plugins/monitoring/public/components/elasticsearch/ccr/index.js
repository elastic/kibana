/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiBasicTable, EuiLink, EuiPage, EuiPageBody, EuiPageContent, EuiPageContentBody, EuiIcon
} from '@elastic/eui';

export class Ccr extends Component {
  constructor(props) {
    super(props);
    this.state = {
      itemIdToExpandedRowMap: {},
    };
  }

  toggleShard(index) {
    const { data: { shardStatsByFollowerIndex } } = this.props;

    const itemIdToExpandedRowMap = {
      ...this.state.itemIdToExpandedRowMap
    };

    if (itemIdToExpandedRowMap[index]) {
      delete itemIdToExpandedRowMap[index];
    } else {
      itemIdToExpandedRowMap[index] = (
        <EuiBasicTable
          items={Object.values(shardStatsByFollowerIndex[index])}
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
              name: 'Last fetch time'
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
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  }

  renderTable() {
    const { data: { all } } = this.props;
    const items = all;

    return (
      <EuiBasicTable
        columns={[
          {
            field: 'index',
            name: 'Index',
            render: (index) => {
              const expanded = !!this.state.itemIdToExpandedRowMap[index];
              return (
                <EuiLink onClick={() => this.toggleShard(index)}>
                  {index}
                  &nbsp;
                  { expanded ? <EuiIcon type="arrowUp" /> : <EuiIcon type="arrowDown" /> }
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
            name: 'Last fetch time'
          },
          {
            field: 'syncLagOps',
            name: 'Sync Lag (ops)'
          },
          {
            field: 'error',
            name: 'Error'
          }
        ]}
        items={items}
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
