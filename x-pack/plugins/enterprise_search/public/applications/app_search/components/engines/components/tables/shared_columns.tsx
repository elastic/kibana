/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableFieldDataColumnType, EuiTableComputedColumnType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n/react';

import { FormattedDateTime } from '../../../../utils/formatted_date_time';
import { EngineDetails } from '../../../engine/types';

export const BLANK_COLUMN: EuiTableComputedColumnType<EngineDetails> = {
  render: () => <></>,
  'aria-hidden': true,
};

export const NAME_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'name',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.name', {
    defaultMessage: 'Name',
  }),
  width: '30%',
  truncateText: true,
  mobileOptions: {
    header: true,
    // Note: the below props are valid props per https://elastic.github.io/eui/#/tabular-content/tables (Responsive tables), but EUI's types have a bug reporting it as an error
    // @ts-ignore
    enlarge: true,
    width: '100%',
    truncateText: false,
  },
};

export const CREATED_AT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'created_at',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.createdAt', {
    defaultMessage: 'Created At',
  }),
  dataType: 'string',
  render: (dateString: string) => <FormattedDateTime date={new Date(dateString)} hideTime />,
};

export const DOCUMENT_COUNT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'document_count',
  name: i18n.translate(
    'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.documentCount',
    {
      defaultMessage: 'Document Count',
    }
  ),
  dataType: 'number',
  render: (number: number) => <FormattedNumber value={number} />,
  truncateText: true,
};

export const FIELD_COUNT_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'field_count',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.fieldCount', {
    defaultMessage: 'Field Count',
  }),
  dataType: 'number',
  render: (number: number) => <FormattedNumber value={number} />,
  truncateText: true,
};
