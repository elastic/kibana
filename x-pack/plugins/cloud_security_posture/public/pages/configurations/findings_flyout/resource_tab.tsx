/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiCodeBlock,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { CspFinding } from '../../../../common/schemas/csp_finding';

interface ResourceItem {
  key: string; // flattened dot notation object path for CspFinding['resource'];
  value: unknown;
}

const getDescriptionDisplay = (value: unknown) => {
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || value === null) {
    return <EuiCode>{JSON.stringify(value)}</EuiCode>;
  }

  if (typeof value === 'object') {
    return (
      <EuiCodeBlock isCopyable={true} overflowHeight={300}>
        {JSON.stringify(value, null, 2)}
      </EuiCodeBlock>
    );
  }

  return <EuiText size="s">{value as string}</EuiText>;
};

const search: EuiInMemoryTableProps<ResourceItem>['search'] = {
  box: {
    incremental: true,
  },
};

const sorting: EuiInMemoryTableProps<ResourceItem>['sorting'] = {
  sort: {
    field: 'key',
    direction: 'asc',
  },
};

const pagination: EuiInMemoryTableProps<ResourceItem>['pagination'] = {
  initialPageSize: 100,
  showPerPageOptions: false,
};

const columns: EuiInMemoryTableProps<ResourceItem>['columns'] = [
  {
    field: 'key',
    name: i18n.translate('xpack.csp.flyout.resource.fieldLabel', { defaultMessage: 'Field' }),
    width: '25%',
  },
  {
    field: 'value',
    name: i18n.translate('xpack.csp.flyout.resource.fieldValueLabel', { defaultMessage: 'Value' }),
    render: (value, record) => <div style={{ width: '100%' }}>{getDescriptionDisplay(value)}</div>,
  },
];

const getFlattenedItems = (resource: CspFinding['resource']) =>
  Object.entries(getFlattenedObject(resource)).map(([key, value]) => ({ key, value }));

export const ResourceTab = ({ data }: { data: CspFinding }) => (
  <EuiInMemoryTable
    items={getFlattenedItems(data.resource)}
    columns={columns}
    sorting={sorting}
    search={search}
    pagination={pagination}
  />
);
