/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiFlexItem } from '@elastic/eui';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { FieldDataRowProps } from '../../types';

export const MetaTable: FC<FieldDataRowProps> = ({ config }) => {
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
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.countLabel"
          defaultMessage="count"
        />
      ),
      value: count,
    },
    {
      function: 'percentage',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.percentageLabel"
          defaultMessage="percentage"
        />
      ),
      value: `${(count / sampleCount) * 100}%`,
    },
    {
      function: 'distinctValues',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCardExpandedRow.numberContent.distinctValueLabel"
          defaultMessage="distinct values"
        />
      ),
      value: cardinality,
    },
  ];
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
    'xpack.ml.fieldDataCardExpandedRow.numberContent.metaTableTitle',
    {
      defaultMessage: 'Documents stats',
    }
  );

  return (
    <EuiFlexItem className="mlFieldDataCard__stats">
      <ExpandedRowFieldHeader>{metaTableTitle}</ExpandedRowFieldHeader>
      <EuiBasicTable
        className={'mlDataVisualizerSummaryTable'}
        compressed
        items={metaTableItems}
        columns={metaTableColumns}
        tableCaption={metaTableTitle}
      />
    </EuiFlexItem>
  );
};
