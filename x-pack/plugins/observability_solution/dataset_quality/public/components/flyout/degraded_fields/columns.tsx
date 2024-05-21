/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DegradedField } from '../../../../common/api_types';

const fieldColumnName = i18n.translate('xpack.datasetQuality.flyout.degradedField.field', {
  defaultMessage: 'Field',
});

const countColumnName = i18n.translate('xpack.datasetQuality.flyout.degradedField.count', {
  defaultMessage: 'Count',
});

const lastOccurrenceColumnName = i18n.translate(
  'xpack.datasetQuality.flyout.degradedField.last_occurrence',
  {
    defaultMessage: 'Last Occurrence',
  }
);

export const getDegradedFieldsColumns = (): Array<EuiBasicTableColumn<DegradedField>> => [
  {
    name: fieldColumnName,
    field: 'fieldName',
  },
  {
    name: countColumnName,
    sortable: true,
    field: 'count',
    truncateText: true,
  },
  {
    name: lastOccurrenceColumnName,
    sortable: true,
    field: 'last_occurrence',
    render: (lastOccurrence: number) => {
      if (lastOccurrence) {
        const date = new Date(lastOccurrence);
        return date.toISOString();
      }

      return '';
    },
  },
];
