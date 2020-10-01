/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, FC } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import { TagSavedObjectWithRelations } from '../../../common/types';
import { TagBadge } from '../../components';
import { PaginationState } from '../types';

interface TagTableProps {
  loading: boolean;
  tags: TagSavedObjectWithRelations[];
  totalTags: number;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;

  // TODO: fix type
  onSelectionChange: (selection: any[]) => void;
}

export const TagTable: FC<TagTableProps> = ({
  loading,
  pagination,
  tags,
  totalTags,
  onPaginationChange,
  onSelectionChange,
}) => {
  const tableRef = useRef<EuiBasicTable>();

  // tableRef.current!.setSelection()

  const onTableChange = (criteria: Criteria<any>) => {
    if (criteria.page) {
      onPaginationChange({ pageNumber: criteria.page.index, pageSize: criteria.page.size });
    }
  };

  // TODO column
  // TODO pagination

  const tablePagination = {
    pageIndex: pagination.pageNumber,
    pageSize: pagination.pageSize,
    totalItemCount: totalTags,
    pageSizeOptions: [5, 10, 20, 50],
  };

  const columns = [
    {
      field: 'attributes.name',
      name: 'Name',
      sortable: true,
      'data-test-subj': 'tagsTableRowName',
      render: (name: string, tag: TagSavedObjectWithRelations) => {
        return <TagBadge tag={tag.attributes} />;
      },
    },
    {
      field: 'attributes.description',
      name: 'Description',
      sortable: true,
      'data-test-subj': 'tagsTableRowDescription',
    },
  ] as any[]; // TODO fix type

  return (
    <EuiBasicTable
      ref={tableRef as any}
      loading={loading}
      itemId={'id'}
      columns={columns}
      items={tags}
      pagination={tablePagination}
      onChange={onTableChange}
      selection={{
        onSelectionChange,
      }}
      rowProps={(item) => ({
        'data-test-subj': `tagsTableRow row-${item.id}`,
      })}
    />
  );
};
