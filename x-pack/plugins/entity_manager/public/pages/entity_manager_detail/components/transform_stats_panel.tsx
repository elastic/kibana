/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformGetTransformStatsTransformIndexerStats } from '@elastic/elasticsearch/lib/api/types';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';

interface TransformStatsPanelProps {
  stats: TransformGetTransformStatsTransformIndexerStats;
}

type StatKey = keyof TransformGetTransformStatsTransformIndexerStats;

interface Stats {
  name: StatKey;
  value?: number;
}

export function TransformStatsPanel({ stats }: TransformStatsPanelProps) {
  const data: Stats[] = (Object.keys(stats) as StatKey[]).map((name) => ({
    name,
    value: stats[name],
  }));

  const columns: Array<EuiBasicTableColumn<Stats>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.entityManager.transformStatsPanel.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      field: 'value',
      name: i18n.translate('xpack.entityManager.transformStatsPanel.valueColumnLabel', {
        defaultMessage: 'Value',
      }),
      align: 'right',
      render: (value: number | undefined) =>
        value != null ? numeral(value).format('0,0[.0]') : '--',
    },
  ];

  return <EuiBasicTable compressed columns={columns} items={data} />;
}
