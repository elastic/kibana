/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect, FC } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { TagWithRelations } from '../../../common/types';
import { TagBadge } from '../../components';

interface TagTableProps {
  loading: boolean;
  tags: TagWithRelations[];
  selectedTags: TagWithRelations[];
  onSelectionChange: (selection: TagWithRelations[]) => void;
  onEdit: (tag: TagWithRelations) => void;
}

const tablePagination = {
  initialPageSize: 20,
  pageSizeOptions: [5, 10, 20, 50],
};

export const TagTable: FC<TagTableProps> = ({
  loading,
  tags,
  onSelectionChange,
  selectedTags,
  onEdit,
}) => {
  const tableRef = useRef<EuiInMemoryTable<any>>();

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.setSelection(selectedTags);
    }
  }, [selectedTags]);

  const columns = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      'data-test-subj': 'tagsTableRowName',
      render: (name: string, tag: TagWithRelations) => {
        return <TagBadge tag={tag} />;
      },
    },
    {
      field: 'description',
      name: 'Description',
      sortable: true,
      'data-test-subj': 'tagsTableRowDescription',
    },
    {
      name: 'Actions',
      width: '100px',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this tag',
          type: 'icon',
          icon: 'pencil',
          onClick: (object: TagWithRelations) => onEdit(object),
          'data-test-subj': 'tagsTableAction-edit',
        },
      ],
    },
  ] as any[]; // TODO fix type

  return (
    <EuiInMemoryTable
      ref={tableRef as any}
      loading={loading}
      itemId={'id'}
      columns={columns}
      items={tags}
      pagination={tablePagination}
      selection={{
        initialSelected: selectedTags,
        onSelectionChange,
      }}
      search={{
        box: {
          incremental: true,
          schema: {
            fields: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      }}
      rowProps={(item) => ({
        'data-test-subj': `tagsTableRow row-${item.id}`,
      })}
    />
  );
};
