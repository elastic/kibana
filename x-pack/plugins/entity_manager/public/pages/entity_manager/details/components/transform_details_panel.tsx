/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiBasicTableColumn, EuiSpacer, EuiTitle } from '@elastic/eui';
import { isString, isNumber } from 'lodash';
import numeral from '@elastic/numeral';
import moment from 'moment';

interface TransformDetailsPanelProps {
  transform: TransformGetTransformTransformSummary;
  stats: TransformGetTransformStatsTransformStats;
}

interface Stat {
  name: string;
  value: string | number | undefined;
}

export function TransformDetailsPanel({ stats, transform }: TransformDetailsPanelProps) {
  const generalStats = [
    { name: 'ID', value: transform.id },
    { name: 'Version', value: transform.version },
    { name: 'Description', value: transform.description },
    { name: 'Created', value: moment(transform.create_time).format('ll LTS') },
    { name: 'Source index', value: [transform.source.index].flat().join(',') },
    { name: 'Dest pipeline', value: transform.dest.pipeline },
    { name: 'Authorization', value: JSON.stringify(transform.authorization) },
  ];

  const checkpointStats = [
    {
      name: 'Last detected chagnes',
      value: moment(stats.checkpointing.changes_last_detected_at).format('ll LTS'),
    },
    {
      name: 'Last checkpoint',
      value: `${stats.checkpointing.last.checkpoint}`,
    },
    {
      name: 'Last timestamp',
      value:
        stats.checkpointing.last.timestamp_millis != null
          ? moment(stats.checkpointing.last.timestamp_millis).format('ll LTS')
          : '--',
    },
    {
      name: 'Last search',
      value:
        stats.checkpointing.last_search_time != null
          ? moment(stats.checkpointing.last_search_time).format('ll LTS')
          : '--',
    },
  ];

  const columns: Array<EuiBasicTableColumn<Stat>> = [
    {
      field: 'name',
      render: (value: string) => <strong>{value}</strong>,
    } as unknown as EuiBasicTableColumn<Stat>,
    {
      field: 'value',
      align: 'right',
      render: (value: number | undefined | string) =>
        isString(value) ? value : isNumber(value) ? numeral(value).format('0,0[.0]') : '--',
    } as unknown as EuiBasicTableColumn<Stat>,
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.entityManager.transformDetailsPanel.h4.generalLabel', {
            defaultMessage: 'General',
          })}
        </h4>
      </EuiTitle>
      <EuiBasicTable compressed columns={columns} items={generalStats} />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.entityManager.transformDetailsPanel.h4.checkpointingLabel', {
            defaultMessage: 'Checkpointing',
          })}
        </h4>
      </EuiTitle>
      <EuiBasicTable compressed columns={columns} items={checkpointStats} />
    </>
  );
}
