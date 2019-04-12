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
  const [dataFrameJobs, setDataFrameJobs] = useState([] as DataFrameJobListRow[]);
  const getJobs = getJobsFactory(setDataFrameJobs);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState(
    {} as ItemIdToExpandedRowMap
  );

  // use this pattern so we don't return a promise
  useEffect(() => {
    getJobs();
  }, []);

  if (dataFrameJobs.length === 0) {
    return <EuiEmptyPrompt title={<h2>Here be Data Frame dragons!</h2>} iconType="editorStrike" />;
  }

  const columns = getColumns(getJobs, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);

  return (
    <EuiInMemoryTable
      items={dataFrameJobs}
      columns={columns}
      pagination={true}
      hasActions={false}
      isSelectable={false}
      itemId={DataFrameJobListColumn.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
    />
  );
};
