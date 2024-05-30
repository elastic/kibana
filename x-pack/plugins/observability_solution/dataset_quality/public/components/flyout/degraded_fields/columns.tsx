/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn } from '@elastic/eui';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

import { DegradedField } from '../../../../common/api_types';
import { SparkPlot } from './spark_plot';

const fieldColumnName = i18n.translate('xpack.datasetQuality.flyout.degradedField.field', {
  defaultMessage: 'Field',
});

const countColumnName = i18n.translate('xpack.datasetQuality.flyout.degradedField.count', {
  defaultMessage: 'Count',
});

const lastOccurrenceColumnName = i18n.translate(
  'xpack.datasetQuality.flyout.degradedField.lastOccurrence',
  {
    defaultMessage: 'Last Occurrence',
  }
);

export const getDegradedFieldsColumns = ({
  dateFormatter,
  isLoading,
}: {
  dateFormatter: FieldFormat;
  isLoading: boolean;
}): Array<EuiBasicTableColumn<DegradedField>> => [
  {
    name: fieldColumnName,
    field: 'name',
  },
  {
    name: countColumnName,
    sortable: true,
    field: 'count',
    render: (_, { count, timeSeries }) => {
      return <SparkPlot series={timeSeries} valueLabel={count} isLoading={isLoading} />;
    },
  },
  {
    name: lastOccurrenceColumnName,
    sortable: true,
    field: 'lastOccurrence',
    render: (lastOccurrence: number) => {
      return dateFormatter.convert(lastOccurrence);
    },
  },
];
