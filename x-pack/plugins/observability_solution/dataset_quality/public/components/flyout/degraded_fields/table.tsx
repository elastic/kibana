/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { orderBy } from 'lodash';
import { getDegradedFieldsColumns } from './columns';
import { Direction, useDatasetQualityFlyout } from '../../../hooks';
import {
  flyoutDegradedFieldsTableLoadingText,
  flyoutDegradedFieldsTableNoData,
} from '../../../../common/translations';
import { DegradedField } from '../../../../common/api_types';

const DEFAULT_SORT_FIELD = 'count';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_ROWS_PER_PAGE = 10;

interface TableOptions {
  page: {
    index: number;
    size: number;
  };
  sort: {
    field: keyof DegradedField;
    direction: 'asc' | 'desc';
  };
}

const DEFAULT_TABLE_OPTIONS: TableOptions = {
  page: {
    index: 0,
    size: 0,
  },
  sort: {
    field: DEFAULT_SORT_FIELD,
    direction: DEFAULT_SORT_DIRECTION,
  },
};

export const DegradedFieldTable = () => {
  const { degradedFields, loadingState } = useDatasetQualityFlyout();
  const columns = getDegradedFieldsColumns();
  const [tableOptions, setTableOptions] = useState<TableOptions>(DEFAULT_TABLE_OPTIONS);

  const onTableChange = (options: {
    page: { index: number; size: number };
    sort?: { field: keyof DegradedField; direction: Direction };
  }) => {
    setTableOptions({
      page: {
        index: options.page.index,
        size: options.page.size,
      },
      sort: {
        field: options.sort?.field ?? DEFAULT_SORT_FIELD,
        direction: options.sort?.direction ?? DEFAULT_SORT_DIRECTION,
      },
    });
  };

  const pagination = useMemo(
    () => ({
      pageIndex: tableOptions.page.index,
      pageSize: DEFAULT_ROWS_PER_PAGE,
      totalItemCount: degradedFields?.length ?? 0,
      hidePerPageOptions: true,
    }),
    [degradedFields, tableOptions]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = orderBy(
      degradedFields,
      tableOptions.sort.field,
      tableOptions.sort.direction
    );
    return sortedItems.slice(
      tableOptions.page.index * DEFAULT_ROWS_PER_PAGE,
      (tableOptions.page.index + 1) * DEFAULT_ROWS_PER_PAGE
    );
  }, [degradedFields, tableOptions]);

  return (
    <EuiBasicTable
      tableLayout="fixed"
      columns={columns}
      items={renderedItems ?? []}
      loading={loadingState.datasetDegradedFieldsLoading}
      sorting={{ sort: tableOptions.sort }}
      onChange={onTableChange}
      pagination={pagination}
      noItemsMessage={
        loadingState.datasetDegradedFieldsLoading ? (
          flyoutDegradedFieldsTableLoadingText
        ) : (
          <EuiEmptyPrompt
            data-test-subj="datasetQualityTableNoData"
            layout="vertical"
            title={<h2>{flyoutDegradedFieldsTableNoData}</h2>}
            hasBorder={false}
            titleSize="m"
          />
        )
      }
    />
  );
};
