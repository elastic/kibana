/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, SFC, useEffect, useState } from 'react';

import {
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  SortDirection,
} from '@elastic/eui';

import {
  DataFrameJobListColumn,
  DataFrameJobListRow,
  ItemIdToExpandedRowMap,
  JobId,
} from './common';
import { getJobsFactory } from './job_service';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';

function getItemIdToExpandedRowMap(
  itemIds: JobId[],
  dataFrameJobs: DataFrameJobListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, jobId: JobId) => {
      const item = dataFrameJobs.find(job => job.config.id === jobId);
      if (item !== undefined) {
        m[jobId] = <ExpandedRow item={item} />;
      }
      return m;
    },
    {} as ItemIdToExpandedRowMap
  );
}

// TODO EUI's types for EuiInMemoryTable is missing these props
interface ExpandableTableProps extends EuiInMemoryTableProps {
  itemIdToExpandedRowMap: ItemIdToExpandedRowMap;
  isExpandable: boolean;
}

const ExpandableTable = (EuiInMemoryTable as any) as FunctionComponent<ExpandableTableProps>;

export const DataFrameJobList: SFC = () => {
  const [dataFrameJobs, setDataFrameJobs] = useState<DataFrameJobListRow[]>([]);
  const getJobs = getJobsFactory(setDataFrameJobs);

  const [expandedRowItemIds, setExpandedRowItemIds] = useState<JobId[]>([]);

  // use this pattern so we don't return a promise, useEffects doesn't like that
  useEffect(() => {
    getJobs();
  }, []);

  if (dataFrameJobs.length === 0) {
    return <EuiEmptyPrompt title={<h2>Here be Data Frame dragons!</h2>} iconType="editorStrike" />;
  }

  const columns = getColumns(getJobs, expandedRowItemIds, setExpandedRowItemIds);

  const sorting = {
    sort: {
      field: DataFrameJobListColumn.id,
      direction: SortDirection.ASC,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, dataFrameJobs);

  return (
    <ExpandableTable
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
