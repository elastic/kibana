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
<<<<<<< HEAD
=======
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

function toSeconds(ms) {
  return Math.floor(ms / 1000) + 's';
}

<<<<<<< HEAD
export class Ccr extends Component {
=======
class CcrUI extends Component {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  constructor(props) {
    super(props);
    this.state = {
      itemIdToExpandedRowMap: {},
    };
  }

  toggleShards(index, shards) {
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
              name: 'Shard',
=======
              name: intl.formatMessage({
                id: 'xpack.monitoring.elasticsearch.ccr.shardsTable.shardColumnTitle',
                defaultMessage: 'Shard'
              }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
              field: 'syncLagOps',
<<<<<<< HEAD
              name: 'Sync Lag (ops)',
=======
              name: intl.formatMessage({
                id: 'xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumnTitle',
                defaultMessage: 'Sync Lag (ops)'
              }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              render: (syncLagOps, data) => (
                <span>
                  {syncLagOps}
                  &nbsp;&nbsp;
                  <EuiIconTip
                    size="m"
                    type="iInCircle"
                    content={(
                      <Fragment>
<<<<<<< HEAD
                        <span>Leader lag: {data.syncLagOpsLeader}</span>
                        <br/>
                        <span>Follower lag: {data.syncLagOpsFollower}</span>
=======
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.leaderLagTooltip"
                            defaultMessage="Leader lag: {syncLagOpsLeader}"
                            values={{
                              syncLagOpsLeader: data.syncLagOpsLeader
                            }}
                          />
                        </span>
                        <br/>
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.followerLagTooltip"
                            defaultMessage="Follower lag: {syncLagOpsFollower}"
                            values={{
                              syncLagOpsFollower: data.syncLagOpsFollower
                            }}
                          />
                        </span>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
                      </Fragment>
                    )}
                    position="right"
                  />
                </span>
              )
            },
            {
              field: 'syncLagTime',
<<<<<<< HEAD
              name: 'Last fetch time',
=======
              name: intl.formatMessage({
                id: 'xpack.monitoring.elasticsearch.ccr.shardsTable.lastFetchTimeColumnTitle',
                defaultMessage: 'Last fetch time'
              }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
            },
            {
              field: 'opsSynced',
<<<<<<< HEAD
              name: 'Ops synced'
            },
            {
              field: 'error',
              name: 'Error',
=======
              name: intl.formatMessage({
                id: 'xpack.monitoring.elasticsearch.ccr.shardsTable.opsSyncedColumnTitle',
                defaultMessage: 'Ops synced'
              }),
            },
            {
              field: 'error',
              name: intl.formatMessage({
                id: 'xpack.monitoring.elasticsearch.ccr.shardsTable.errorColumnTitle',
                defaultMessage: 'Error'
              }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
    const { data } = this.props;
=======
    const { data, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
            name: 'Index',
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.indexColumnTitle',
              defaultMessage: 'Index'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
            name: 'Follows'
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.followsColumnTitle',
              defaultMessage: 'Follows'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
          {
            field: 'syncLagOps',
            sortable: true,
<<<<<<< HEAD
            name: 'Sync Lag (ops)',
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.syncLagOpsColumnTitle',
              defaultMessage: 'Sync Lag (ops)'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
          {
            field: 'syncLagTime',
            sortable: true,
<<<<<<< HEAD
            name: 'Last fetch time',
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.lastFetchTimeColumnTitle',
              defaultMessage: 'Last fetch time'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
          },
          {
            field: 'opsSynced',
            sortable: true,
<<<<<<< HEAD
            name: 'Ops synced'
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.opsSyncedColumnTitle',
              defaultMessage: 'Ops synced'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          },
          {
            field: 'error',
            sortable: true,
<<<<<<< HEAD
            name: 'Error',
=======
            name: intl.formatMessage({
              id: 'xpack.monitoring.elasticsearch.ccr.ccrListingTable.errorColumnTitle',
              defaultMessage: 'Error'
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const Ccr = injectI18n(CcrUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
