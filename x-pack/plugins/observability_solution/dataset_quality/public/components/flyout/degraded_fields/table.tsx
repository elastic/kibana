/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { useDatasetQualityDegradedField } from '../../../hooks';
import { getDegradedFieldsColumns } from './columns';
import {
  flyoutDegradedFieldsTableLoadingText,
  flyoutDegradedFieldsTableNoData,
} from '../../../../common/translations';

export const DegradedFieldTable = () => {
  const { loadingState, pagination, renderedItems, onTableChange, sort } =
    useDatasetQualityDegradedField();
  const columns = getDegradedFieldsColumns();

  return (
    <EuiBasicTable
      tableLayout="fixed"
      columns={columns}
      items={renderedItems ?? []}
      loading={loadingState.datasetDegradedFieldsLoading}
      sorting={sort}
      onChange={onTableChange}
      pagination={pagination}
      data-test-subj="datasetQualityFlyoutDegradedFieldTable"
      rowProps={{
        'data-test-subj': 'datasetQualityFlyoutDegradedTableRow',
      }}
      noItemsMessage={
        loadingState.datasetDegradedFieldsLoading ? (
          flyoutDegradedFieldsTableLoadingText
        ) : (
          <EuiEmptyPrompt
            data-test-subj="datasetQualityFlyoutDegradedTableNoData"
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
