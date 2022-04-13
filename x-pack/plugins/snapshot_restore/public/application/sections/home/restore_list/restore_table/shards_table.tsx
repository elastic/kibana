/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTable,
  EuiProgress,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { SnapshotRestore, SnapshotRestoreShard } from '../../../../../../common/types';
import { useServices } from '../../../../app_context';
import { FormattedDateTime } from '../../../../components';

interface Props {
  shards: SnapshotRestore['shards'];
}

export const ShardsTable: React.FunctionComponent<Props> = ({ shards }) => {
  const { i18n } = useServices();

  const Progress = ({
    total,
    restored,
    percent,
  }: {
    total: number;
    restored: number;
    percent: string;
  }) => (
    <EuiToolTip
      position="top"
      content={i18n.translate('xpack.snapshotRestore.restoreList.shardTable.progressTooltipLabel', {
        defaultMessage: '{restored} of {total} restored',
        values: {
          restored,
          total,
        },
      })}
    >
      <EuiText size="xs" textAlign="center" style={{ width: '100%' }}>
        <EuiProgress value={total === 0 ? 1 : restored} max={total === 0 ? 1 : total} size="xs" />
        <EuiSpacer size="xs" />
        {percent}
      </EuiText>
    </EuiToolTip>
  );

  const columns = [
    {
      field: 'id',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.indexColumnTitle', {
        defaultMessage: 'ID',
      }),
      width: '40px',
      render: (id: SnapshotRestoreShard['id'], shard: SnapshotRestoreShard) =>
        shard.primary ? (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>{id}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="right"
                content={
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreList.shardTable.primaryTooltipLabel"
                    defaultMessage="Primary"
                  />
                }
              >
                <strong>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreList.shardTable.primaryAbbreviationText"
                    defaultMessage="P"
                    description="Used as an abbreviation for 'Primary', as in 'Primary shard'"
                  />
                </strong>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          id
        ),
    },
    {
      field: 'stage',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.stageColumnTitle', {
        defaultMessage: 'Stage',
      }),
    },
    {
      field: 'startTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.startTimeColumnTitle', {
        defaultMessage: 'Start time',
      }),
      render: (startTimeInMillis: SnapshotRestoreShard['startTimeInMillis']) =>
        startTimeInMillis ? (
          <FormattedDateTime epochMs={startTimeInMillis} />
        ) : (
          <EuiLoadingSpinner size="m" />
        ),
    },
    {
      field: 'stopTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.endTimeColumnTitle', {
        defaultMessage: 'End time',
      }),
      render: (stopTimeInMillis: SnapshotRestoreShard['stopTimeInMillis']) =>
        stopTimeInMillis ? (
          <FormattedDateTime epochMs={stopTimeInMillis} />
        ) : (
          <EuiLoadingSpinner size="m" />
        ),
    },
    {
      field: 'totalTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.durationColumnTitle', {
        defaultMessage: 'Duration',
      }),
      render: (totalTimeInMillis: SnapshotRestoreShard['totalTimeInMillis']) =>
        totalTimeInMillis ? (
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.shardTable.durationValue"
            defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
            values={{ seconds: Math.ceil(totalTimeInMillis / 1000) }}
          />
        ) : (
          <EuiLoadingSpinner size="m" />
        ),
    },
    {
      field: 'repository',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.repositoryColumnTitle', {
        defaultMessage: 'Repository',
      }),
    },
    {
      field: 'snapshot',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.snapshotColumnTitle', {
        defaultMessage: 'Snapshot',
      }),
    },
    {
      field: 'version',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.versionColumnTitle', {
        defaultMessage: 'Version',
      }),
    },
    {
      field: 'targetHost',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.targetHostColumnTitle', {
        defaultMessage: 'Target host',
      }),
    },
    {
      field: 'targetNode',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.targetNodeColumnTitle', {
        defaultMessage: 'Target node',
      }),
    },
    {
      field: 'bytesTotal',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.bytesColumnTitle', {
        defaultMessage: 'Bytes',
      }),
      render: (
        bytesTotal: SnapshotRestoreShard['bytesTotal'],
        { bytesRecovered, bytesPercent }: SnapshotRestoreShard
      ) => <Progress total={bytesTotal} restored={bytesRecovered} percent={bytesPercent} />,
    },
    {
      field: 'filesTotal',
      name: i18n.translate('xpack.snapshotRestore.restoreList.shardTable.filesColumnTitle', {
        defaultMessage: 'Files',
      }),
      render: (
        filesTotal: SnapshotRestoreShard['filesTotal'],
        { filesRecovered, filesPercent }: SnapshotRestoreShard
      ) => <Progress total={filesTotal} restored={filesRecovered} percent={filesPercent} />,
    },
  ];

  return (
    <EuiBasicTable
      className="snapshotRestore__shardsTable"
      compressed={true}
      // @ts-ignore `shards` is a Partial<> but this component treats a number of fields as required
      items={shards}
      columns={columns}
    />
  );
};
