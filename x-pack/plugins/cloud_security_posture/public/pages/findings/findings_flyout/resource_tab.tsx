/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EuiInMemoryTableProps,
  EuiMarkdownFormat,
  EuiInMemoryTable,
  EuiToolTip,
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiCopy,
} from '@elastic/eui';
import React from 'react';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';

interface ResourceItem {
  key: string; // flattened dot notation object path for CspFinding['resource'];
  value: unknown;
}

function renderField(record: ResourceItem) {
  switch (record.key) {
    case 'id':
    case 'name':
      return <EuiCode>{JSON.stringify(record.value, null, 2)}</EuiCode>;

    default:
      return <EuiMarkdownFormat>{record.value as string}</EuiMarkdownFormat>;
  }
}

const columns: EuiInMemoryTableProps<ResourceItem>['columns'] = [
  {
    field: 'key',
    name: i18n.translate('xpack.csp.flyout.resource.fieldLabel', { defaultMessage: 'Field' }),
    width: '25%',
    render: (value: string) => (
      <EuiCopy textToCopy={value} anchorClassName="eui-textTruncate">
        {(copy) => (
          <EuiToolTip content={value} delay="long">
            <EuiText color="subdued" onClick={copy}>
              {value}
            </EuiText>
          </EuiToolTip>
        )}
      </EuiCopy>
    ),
  },
  {
    field: 'value',
    name: i18n.translate('xpack.csp.flyout.resource.fieldValueLabel', { defaultMessage: 'Value' }),
    render: (value, record) => (
      <EuiCopy textToCopy={value}>
        {(copy) => <button onClick={copy}>{renderField(record)}</button>}
      </EuiCopy>
    ),
  },
];

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

const getFlattenedItems = (resource: CspFinding['resource']) =>
  Object.entries(getFlattenedObject(resource)).map(([key, value]) => ({ key, value }));

export const ResourceTab = ({ data }: { data: CspFinding }) => {
  const items = getFlattenedItems(data.resource);
  return (
    <>
      <EuiInMemoryTable
        items={items}
        search={search}
        sorting={sorting}
        columns={columns}
        pagination={pagination}
      />
      <EuiSpacer size="m" />
    </>
  );
};
