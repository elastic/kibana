/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { EsqlQueryResult } from '../hooks/use_esql_query_result';

export function getInitialColumnsForLogs({ result }: { result: EsqlQueryResult }) {
  const datatable = result.value;
  if (!datatable) {
    return [];
  }

  const timestampColumnIndex = datatable.columns.findIndex(
    (column) => column.name === '@timestamp'
  );

  let messageColumnIndex = datatable.columns.findIndex((column) => column.name === 'message');

  if (messageColumnIndex === -1) {
    messageColumnIndex = datatable.columns.findIndex(
      (column) => column.meta.esType === ES_FIELD_TYPES.TEXT
    );
  }

  if (datatable.columns.length > 20 && timestampColumnIndex !== -1 && messageColumnIndex !== -1) {
    const hasDataForBothColumns = datatable.rows.every((row) => {
      const timestampValue = row[timestampColumnIndex];
      const messageValue = row[messageColumnIndex];

      return timestampValue !== null && timestampValue !== undefined && !!messageValue;
    });

    if (hasDataForBothColumns) {
      return [datatable.columns[timestampColumnIndex], datatable.columns[messageColumnIndex]];
    }
  }
  return datatable.columns;
}
