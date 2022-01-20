/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiIcon,
  EuiIconTip,
  EuiTextColor,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { AlertsStatus } from '../../../alerts/status';
import './ccr.scss';

function toSeconds(ms) {
  return Math.floor(ms / 1000) + 's';
}

export const Ccr = (props) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState({});
  const toggleShards = (index, shards) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[index]) {
      delete itemIdToExpandedRowMapValues[index];
    } else {
      let pagination = {
        initialPageSize: 5,
        pageSizeOptions: [5, 10, 20],
      };

      if (shards.length <= pagination.initialPageSize) {
        pagination = false;
      }

      itemIdToExpandedRowMapValues[index] = (
        <EuiInMemoryTable
          items={shards}
          columns={[
            {
              field: 'shardId',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.shardColumnTitle',
                {
                  defaultMessage: 'Shard',
                }
              ),
              render: (shardId) => {
                return (
                  <EuiLink
                    href={getSafeForExternalLink(`#/elasticsearch/ccr/${index}/shard/${shardId}`)}
                  >
                    {shardId}
                  </EuiLink>
                );
              },
            },
            {
              render: () => null,
            },
            {
              field: 'alerts',
              sortable: true,
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.alertsColumnTitle',
                {
                  defaultMessage: 'Alerts',
                }
              ),
              render: (_field, item) => {
                return (
                  <AlertsStatus
                    showBadge={true}
                    alerts={props.alerts}
                    stateFilter={(state) => state.meta.shardId === item.shardId}
                  />
                );
              },
            },
            {
              field: 'syncLagOps',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumnTitle',
                {
                  defaultMessage: 'Sync Lag (ops)',
                }
              ),
              render: (syncLagOps, data) => (
                <span>
                  {syncLagOps}
                  &nbsp;&nbsp;
                  <EuiIconTip
                    size="m"
                    type="iInCircle"
                    content={
                      <Fragment>
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.leaderLagTooltip"
                            defaultMessage="Leader lag: {syncLagOpsLeader}"
                            values={{
                              syncLagOpsLeader: data.syncLagOpsLeader,
                            }}
                          />
                        </span>
                        <br />
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.followerLagTooltip"
                            defaultMessage="Follower lag: {syncLagOpsFollower}"
                            values={{
                              syncLagOpsFollower: data.syncLagOpsFollower,
                            }}
                          />
                        </span>
                      </Fragment>
                    }
                    position="right"
                  />
                </span>
              ),
            },
            {
              field: 'syncLagTime',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.lastFetchTimeColumnTitle',
                {
                  defaultMessage: 'Last fetch time',
                }
              ),
              render: (syncLagTime) => <span>{toSeconds(syncLagTime)}</span>,
            },
            {
              field: 'opsSynced',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.opsSyncedColumnTitle',
                {
                  defaultMessage: 'Ops synced',
                }
              ),
            },
            {
              field: 'error',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.errorColumnTitle',
                {
                  defaultMessage: 'Error',
                }
              ),
              render: (error) => <EuiTextColor color="danger">{error}</EuiTextColor>,
            },
          ]}
          executeQueryOptions={{
            defaultFields: ['shardId'],
          }}
          sorting={true}
          pagination={pagination}
        />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const renderTable = () => {
    const { data, alerts } = props;
    const items = data;

    let pagination = {
      initialPageSize: 5,
      pageSizeOptions: [5, 10, 20],
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
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.indexColumnTitle',
              {
                defaultMessage: 'Index',
              }
            ),
            sortable: true,
            render: (index, { shards }) => {
              const expanded = !!itemIdToExpandedRowMap[index];
              return (
                <EuiLink onClick={() => toggleShards(index, shards)}>
                  {index}
                  &nbsp;
                  {expanded ? <EuiIcon type="arrowUp" /> : <EuiIcon type="arrowDown" />}
                </EuiLink>
              );
            },
          },
          {
            field: 'follows',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.followsColumnTitle',
              {
                defaultMessage: 'Follows',
              }
            ),
          },
          {
            field: 'alerts',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.alertsColumnTitle',
              {
                defaultMessage: 'Alerts',
              }
            ),
            render: (_field, item) => {
              return (
                <AlertsStatus
                  showBadge={true}
                  alerts={alerts}
                  stateFilter={(state) => state.meta.followerIndex === item.index}
                />
              );
            },
          },
          {
            field: 'syncLagOps',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.syncLagOpsColumnTitle',
              {
                defaultMessage: 'Sync Lag (ops)',
              }
            ),
          },
          {
            field: 'syncLagTime',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.lastFetchTimeColumnTitle',
              {
                defaultMessage: 'Last fetch time',
              }
            ),
            render: (syncLagTime) => <span>{toSeconds(syncLagTime)}</span>,
          },
          {
            field: 'opsSynced',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.opsSyncedColumnTitle',
              {
                defaultMessage: 'Ops synced',
              }
            ),
          },
          {
            field: 'error',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.errorColumnTitle',
              {
                defaultMessage: 'Error',
              }
            ),
            render: (error) => <EuiTextColor color="danger">{error}</EuiTextColor>,
          },
        ]}
        items={items}
        pagination={pagination}
        executeQueryOptions={{
          defaultFields: ['index', 'follows'],
        }}
        sorting={sorting}
        itemId="id"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      />
    );
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.ccr.heading"
              defaultMessage="CCR"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageContent>
          <EuiPageContentBody>{renderTable()}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
