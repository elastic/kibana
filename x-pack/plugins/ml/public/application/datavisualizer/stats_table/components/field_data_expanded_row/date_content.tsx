/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode } from 'react';
import { EuiBasicTable, EuiFlexItem } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { FormattedMessage } from '@kbn/i18n/react';

import { i18n } from '@kbn/i18n';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
const TIME_FORMAT = 'MMM D YYYY, HH:mm:ss.SSS';
interface SummaryTableItem {
  function: string;
  display: ReactNode;
  value: number | string | undefined | null;
}

export const DateContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { earliest, latest } = stats;

  const summaryTableTitle = i18n.translate('xpack.ml.fieldDataCard.cardDate.summaryTableTitle', {
    defaultMessage: 'Summary',
  });
  const summaryTableItems = [
    {
      function: 'earliest',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.earliestLabel"
          defaultMessage="earliest"
        />
      ),
      value: typeof earliest === 'string' ? earliest : formatDate(earliest, TIME_FORMAT),
    },
    {
      function: 'latest',
      display: (
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardDate.latestLabel"
          defaultMessage="latest"
        />
      ),
      value: typeof latest === 'string' ? latest : formatDate(latest, TIME_FORMAT),
    },
  ];
  const summaryTableColumns = [
    {
      name: '',
      render: (summaryItem: { display: ReactNode }) => summaryItem.display,
      width: '75px',
    },
    {
      field: 'value',
      name: '',
      render: (v: string) => <strong>{v}</strong>,
    },
  ];

  return (
    <ExpandedRowContent dataTestSubj={'mlDVDateContent'}>
      <DocumentStatsTable config={config} />
      <EuiFlexItem className={'mlDataVisualizerSummaryTableWrapper'}>
        <ExpandedRowFieldHeader>{summaryTableTitle}</ExpandedRowFieldHeader>
        <EuiBasicTable<SummaryTableItem>
          className={'mlDataVisualizerSummaryTable'}
          data-test-subj={'mlDateSummaryTable'}
          compressed
          items={summaryTableItems}
          columns={summaryTableColumns}
          tableCaption={summaryTableTitle}
          tableLayout="auto"
        />
      </EuiFlexItem>
    </ExpandedRowContent>
  );
};
