/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiFlexItem } from '@elastic/eui';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { FieldDataRowProps } from '../../types';
import { roundToDecimalPlace } from '../../../utils';

const metaTableColumns = [
  {
    name: '',
    render: (metaItem: { display: ReactNode }) => metaItem.display,
    width: '75px',
  },
  {
    field: 'value',
    name: '',
    render: (v: string) => <strong>{v}</strong>,
  },
];

const metaTableTitle = i18n.translate(
  'xpack.fileDataVisualizer.fieldDataCardExpandedRow.documentStatsTable.metaTableTitle',
  {
    defaultMessage: 'Documents stats',
  }
);

export const DocumentStatsTable: FC<FieldDataRowProps> = ({ config }) => {
  if (
    config?.stats === undefined ||
    config.stats.cardinality === undefined ||
    config.stats.count === undefined ||
    config.stats.sampleCount === undefined
  )
    return null;
  const { cardinality, count, sampleCount } = config.stats;
  const metaTableItems = [
    {
      function: 'count',
      display: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.documentStatsTable.countLabel"
          defaultMessage="count"
        />
      ),
      value: count,
    },
    {
      function: 'percentage',
      display: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.documentStatsTable.percentageLabel"
          defaultMessage="percentage"
        />
      ),
      value: `${roundToDecimalPlace((count / sampleCount) * 100)}%`,
    },
    {
      function: 'distinctValues',
      display: (
        <FormattedMessage
          id="xpack.fileDataVisualizer.fieldDataCardExpandedRow.documentStatsTable.distinctValueLabel"
          defaultMessage="distinct values"
        />
      ),
      value: cardinality,
    },
  ];

  return (
    <EuiFlexItem
      data-test-subj={'mlDVDocumentStatsContent'}
      className={'dataVisualizerSummaryTableWrapper'}
    >
      <ExpandedRowFieldHeader>{metaTableTitle}</ExpandedRowFieldHeader>
      <EuiBasicTable
        className={'dataVisualizerSummaryTable'}
        compressed
        items={metaTableItems}
        columns={metaTableColumns}
        tableCaption={metaTableTitle}
      />
    </EuiFlexItem>
  );
};
