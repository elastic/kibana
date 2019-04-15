/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useState } from 'react';

import { EuiEmptyPrompt, EuiInMemoryTable } from '@elastic/eui';

import { DataFrameJobListColumn, DataFrameJobListRow, ItemIdToExpandedRowMap } from './common';
import { getJobsFactory } from './job_service';
import { getColumns } from './columns';

export const DataFrameJobList: SFC = () => {
  const [dataFrameJobs, setDataFrameJobs] = useState<DataFrameJobListRow[]>([]);
  const getJobs = getJobsFactory(setDataFrameJobs);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<ItemIdToExpandedRowMap>({});

  // use this pattern so we don't return a promise, useEffects doesn't like that
  useEffect(() => {
    getJobs();
  }, []);

  if (dataFrameJobs.length === 0) {
    return <EuiEmptyPrompt title={<h2>Here be Data Frame dragons!</h2>} iconType="editorStrike" />;
  }

  const columns = getColumns(getJobs, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);

  const sorting = {
    sort: {
      field: DataFrameJobListColumn.id,
      direction: 'asc',
    },
  };

  return (
    // @ts-ignore
    <EuiInMemoryTable
      columns={columns}
      hasActions={false}
      isExpandable={true}
      isSelectable={false}
      items={dataFrameJobs}
      itemId={DataFrameJobListColumn.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      pagination={true}
      sorting={sorting}
    />
  );
};
