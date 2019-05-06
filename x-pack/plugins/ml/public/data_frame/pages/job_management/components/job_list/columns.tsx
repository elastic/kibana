/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiButtonIcon, RIGHT_ALIGNMENT } from '@elastic/eui';

import { DataFrameJobListColumn, DataFrameJobListRow, JobId } from './common';
import { getActions } from './actions';

export const getColumns = (
  getJobs: () => void,
  expandedRowItemIds: JobId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<JobId[]>>
) => {
  const actions = getActions(getJobs);

  function toggleDetails(item: DataFrameJobListRow) {
    const index = expandedRowItemIds.indexOf(item.config.id);
    if (index !== -1) {
      expandedRowItemIds.splice(index, 1);
      setExpandedRowItemIds([...expandedRowItemIds]);
    } else {
      expandedRowItemIds.push(item.config.id);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  return [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataFrameJobListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.ml.dataframe.jobsList.rowCollapse', {
                  defaultMessage: 'Hide details for {jobId}',
                  values: { jobId: item.config.id },
                })
              : i18n.translate('xpack.ml.dataframe.jobsList.rowExpand', {
                  defaultMessage: 'Show details for {jobId}',
                  values: { jobId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameJobListColumn.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.configSourceIndex,
      name: i18n.translate('xpack.ml.dataframe.sourceIndex', { defaultMessage: 'Source index' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.configDestIndex,
      name: i18n.translate('xpack.ml.dataframe.targetIndex', { defaultMessage: 'Target index' }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.ml.dataframe.status', { defaultMessage: 'Status' }),
      sortable: true,
      truncateText: true,
      render(item: DataFrameJobListRow) {
        const color = item.state.task_state === 'started' ? 'primary' : 'hollow';
        return <EuiBadge color={color}>{item.state.task_state}</EuiBadge>;
      },
    },
    {
      name: i18n.translate('xpack.ml.dataframe.tableActionLabel', { defaultMessage: 'Actions' }),
      actions,
    },
  ];
};
