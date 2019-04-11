/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useState } from 'react';

import { EuiButtonIcon, EuiEmptyPrompt, EuiInMemoryTable, RIGHT_ALIGNMENT } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

import { Dictionary } from '../../../../common/types/common';

interface GetDataFrameTransformsResponse {
  count: number;
  transforms: [];
}

interface DataFrameJob {
  id: string;
}

enum DataFrameJobFields {
  id = 'id',
  source = 'source',
  dest = 'dest',
}

type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

export const DataFrameList: SFC = () => {
  const [dataFrameJobs, setDataFrameJobs] = useState([] as DataFrameJob[]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState(
    {} as ItemIdToExpandedRowMap
  );

  function toggleDetails(item: DataFrameJob) {
    if (itemIdToExpandedRowMap[item.id]) {
      delete itemIdToExpandedRowMap[item.id];
    } else {
      itemIdToExpandedRowMap[item.id] = <div>EXPAND {item.id}</div>;
    }
    // spread to a new object otherwise the component wouldn't re-render
    setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap });
  }

  const getJobs = async () => {
    try {
      const jobs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
      setDataFrameJobs(jobs.transforms);
    } catch (e) {
      console.log('error loading data frame jobs', e);
    }
  };

  // use this pattern so we don't return a promise
  useEffect(() => {
    getJobs();
  }, []);

  if (dataFrameJobs.length === 0) {
    return <EuiEmptyPrompt title={<h2>Here be Data Frame dragons!</h2>} iconType="editorStrike" />;
  }

  const columns = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataFrameJob) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameJobFields.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobFields.source,
      name: 'Source index',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobFields.dest,
      name: 'Target index',
      sortable: true,
      truncateText: true,
    },
  ];

  return (
    <EuiInMemoryTable
      items={dataFrameJobs}
      columns={columns}
      pagination={true}
      hasActions={false}
      isSelectable={false}
      itemId={DataFrameJobFields.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
    />
  );
};
