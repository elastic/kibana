/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiInMemoryTable, EuiBadge, EuiButton } from '@elastic/eui';
import { RawTagWithId } from '../../../../common';
import { useServices } from '../../context';

const pagination = {
  initialPageSize: 25,
  pageSizeOptions: [25, 100],
};

export const TagTable: React.FC = () => {
  const { manager } = useServices();
  const initializing = manager.useInitializing();
  const tagMap = manager.useTags();
  const tags = useMemo(() => Object.values(tagMap).map(({ data }) => data), [tagMap]);
  const [selection, onSelectionChange] = useState<RawTagWithId[]>([]);

  return (
    <EuiInMemoryTable<RawTagWithId>
      itemId={'id'}
      items={tags}
      columns={[
        {
          field: 'title',
          name: 'Tag',
          sortable: true,
          render: (value: string, record: RawTagWithId) => (
            <EuiBadge color={record.color}>{value}</EuiBadge>
          ),
        },
        {
          field: 'description',
          name: 'Description',
          sortable: true,
        },
      ]}
      hasActions
      pagination={pagination}
      sorting={true}
      search={{
        box: {
          placeholder: 'Search',
        },
        toolsLeft: !selection.length ? undefined : (
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => manager.delete$(selection.map(({ id }) => id))}
          >
            Delete {selection.length} tags
          </EuiButton>
        ),
      }}
      loading={initializing}
      message={undefined}
      selection={{
        onSelectionChange,
        selectable: () => true,
      }}
    />
  );
};
