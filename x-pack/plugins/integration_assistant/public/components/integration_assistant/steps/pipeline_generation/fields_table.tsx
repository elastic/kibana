/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiInMemoryTable, type EuiBasicTableColumn, type EuiSearchBarProps } from '@elastic/eui';

interface FieldsTableProps {
  documents: object[];
}

interface FieldObject {
  type: string;
  name: string;
  value: string;
}

const columns: Array<EuiBasicTableColumn<FieldObject>> = [
  {
    field: 'type',
    name: 'Type',
    sortable: true,
    width: '100px',
  },
  {
    field: 'name',
    name: 'Name',
    truncateText: true,
    sortable: true,
  },
  {
    field: 'value',
    name: 'Value',
    sortable: true,
  },
];

const search: EuiSearchBarProps = {
  box: {
    incremental: true,
    schema: true,
  },
};

const flattenDocument = (document: object): FieldObject[] => {
  const fields: FieldObject[] = [];
  const flatten = (object: object, prefix = '') => {
    Object.entries(object).forEach(([key, value]) => {
      if (!Array.isArray(value) && typeof value === 'object' && value !== null) {
        flatten(value, `${prefix}${key}.`);
      } else {
        fields.push({ name: `${prefix}${key}`, value, type: 'keyword' }); // TODO: get type from ECS definition
      }
    });
  };
  flatten(document);
  return fields;
};

export const FieldsTable = React.memo<FieldsTableProps>(({ documents }) => {
  const fields = useMemo(() => flattenDocument(documents[0]), [documents]);
  return (
    <EuiInMemoryTable
      items={fields}
      columns={columns}
      search={search}
      pagination={true}
      sorting={true}
    />
  );
});
FieldsTable.displayName = 'FieldsTable';
