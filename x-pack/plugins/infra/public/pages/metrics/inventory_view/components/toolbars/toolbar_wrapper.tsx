/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';

import { SnapshotMetricType } from '../../../../../../common/inventory_models/types';
import { fieldToName } from '../../lib/field_to_display_name';
import { useSourceContext } from '../../../../../containers/source';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { WaffleInventorySwitcher } from '../waffle/waffle_inventory_switcher';
import { ToolbarProps } from './toolbar';
import { SNAPSHOT_METRIC_TRANSLATIONS } from '../../../../../../common/inventory_models/intl_strings';

interface Props {
  children: (props: Omit<ToolbarProps, 'accounts' | 'regions'>) => React.ReactElement;
}

export const ToolbarWrapper = (props: Props) => {
  const {
    changeMetric,
    changeGroupBy,
    changeCustomOptions,
    changeAccount,
    changeRegion,
    changeSort,
    customOptions,
    groupBy,
    metric,
    nodeType,
    accountId,
    view,
    region,
    legend,
    sort,
    customMetrics,
    changeCustomMetrics,
  } = useWaffleOptionsContext();
  const { createDerivedIndexPattern } = useSourceContext();
  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleInventorySwitcher />
      </EuiFlexItem>
      {props.children({
        createDerivedIndexPattern,
        changeMetric,
        changeGroupBy,
        changeAccount,
        changeRegion,
        changeCustomOptions,
        changeSort,
        customOptions,
        groupBy,
        sort,
        view,
        metric,
        nodeType,
        region,
        accountId,
        legend,
        customMetrics,
        changeCustomMetrics,
      })}
    </>
  );
};

export const toGroupByOpt = (field: string) => ({
  text: fieldToName(field),
  field,
});

export const toMetricOpt = (
  metric: SnapshotMetricType
): { text: string; value: SnapshotMetricType } | undefined => {
  switch (metric) {
    case 'cpu':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.cpu,
        value: 'cpu',
      };
    case 'memory':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.memory,
        value: 'memory',
      };
    case 'rx':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.rx,
        value: 'rx',
      };
    case 'tx':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.tx,
        value: 'tx',
      };
    case 'logRate':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.logRate,
        value: 'logRate',
      };
    case 'load':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.load,
        value: 'load',
      };

    case 'count':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.count,
        value: 'count',
      };
    case 'diskIOReadBytes':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.diskIOReadBytes,
        value: 'diskIOReadBytes',
      };
    case 'diskIOWriteBytes':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.diskIOWriteBytes,
        value: 'diskIOWriteBytes',
      };
    case 's3BucketSize':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.s3BucketSize,
        value: 's3BucketSize',
      };
    case 's3TotalRequests':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.s3TotalRequests,
        value: 's3TotalRequests',
      };
    case 's3NumberOfObjects':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.s3NumberOfObjects,
        value: 's3NumberOfObjects',
      };
    case 's3DownloadBytes':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.s3DownloadBytes,
        value: 's3DownloadBytes',
      };
    case 's3UploadBytes':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.s3UploadBytes,
        value: 's3UploadBytes',
      };
    case 'rdsConnections':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.rdsConnections,
        value: 'rdsConnections',
      };
    case 'rdsQueriesExecuted':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.rdsQueriesExecuted,
        value: 'rdsQueriesExecuted',
      };
    case 'rdsActiveTransactions':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.rdsActiveTransactions,
        value: 'rdsActiveTransactions',
      };
    case 'rdsLatency':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.rdsLatency,
        value: 'rdsLatency',
      };
    case 'sqsMessagesVisible':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.sqsMessagesVisible,
        value: 'sqsMessagesVisible',
      };
    case 'sqsMessagesDelayed':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.sqsMessagesDelayed,
        value: 'sqsMessagesDelayed',
      };
    case 'sqsMessagesSent':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.sqsMessagesSent,
        value: 'sqsMessagesSent',
      };
    case 'sqsMessagesEmpty':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.sqsMessagesEmpty,
        value: 'sqsMessagesEmpty',
      };
    case 'sqsOldestMessage':
      return {
        text: SNAPSHOT_METRIC_TRANSLATIONS.sqsOldestMessage,
        value: 'sqsOldestMessage',
      };
  }
};
