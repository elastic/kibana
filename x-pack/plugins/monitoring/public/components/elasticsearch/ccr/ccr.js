/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiIcon,
  EuiIconTip,
  EuiTextColor
} from '@elastic/eui';

import './ccr.css';

function toSeconds(ms) {
  return Math.floor(ms / 1000) + 's';
}

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
      let pagination = {
        initialPageSize: 5,
        pageSizeOptions: [5, 10, 20]
      };

      if (shards.length <= pagination.initialPageSize) {
        pagination = false;
      }

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
              render: () => null
            },
            {
              field: 'opsSynced',
              name: 'Ops synced'
            },
            {
              field: 'syncLagTime',
              name: 'Last fetch time',
              render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
            },
            {
              field: 'syncLagOps',
              name: 'Sync Lag (ops)',
              render: (syncLagOps, data) => (
                <span>
                  {syncLagOps}
                  &nbsp;&nbsp;
                  <EuiIconTip
                    size="m"
                    type="iInCircle"
                    content={(
                      <Fragment>
                        <span>Leader lag: {data.syncLagOpsLeader}</span>
                        <br/>
                        <span>Follower lag: {data.syncLagOpsFollower}</span>
                      </Fragment>
                    )}
                    position="right"
                  />
                </span>
              )
            },
            {
              field: 'error',
              name: 'Error',
              render: error => (
                <EuiTextColor color="danger">
                  {error}
                </EuiTextColor>
              )
            }
          ]}
          sorting={true}
          pagination={pagination}
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  }

  renderTable() {
    const { data } = this.props;
    const items = data;

    let pagination = {
      initialPageSize: 5,
      pageSizeOptions: [5, 10, 20]
    };

    if (items.length <= pagination.initialPageSize) {
      pagination = false;
    }

    const sorting = {
      sort: {
        field: 'index',
        direction: 'asc',
      },
    };

    return (
      <EuiInMemoryTable
        className="monitoringElasticsearchCcrListingTable"
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
            name: 'Last fetch time',
            render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
          },
          {
            field: 'syncLagOps',
            sortable: true,
            name: 'Sync Lag (ops)',
          },
          {
            field: 'error',
            sortable: true,
            name: 'Error',
            render: error => (
              <EuiTextColor color="danger">
                {error}
              </EuiTextColor>
            )
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
