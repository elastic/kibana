/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, RIGHT_ALIGNMENT } from '@elastic/eui';

import { DataFrameJobListColumn, DataFrameJobListRow, ItemIdToExpandedRowMap } from './common';
import { getActions } from './actions';

export const getColumns = (
  getJobs: () => void,
  itemIdToExpandedRowMap: ItemIdToExpandedRowMap,
  setItemIdToExpandedRowMap: React.Dispatch<React.SetStateAction<ItemIdToExpandedRowMap>>
) => {
  const actions = getActions(getJobs);

  function toggleDetails(item: DataFrameJobListRow) {
    if (itemIdToExpandedRowMap[item.config.id]) {
      delete itemIdToExpandedRowMap[item.config.id];
    } else {
      itemIdToExpandedRowMap[item.config.id] = <div>EXPAND {item.config.id}</div>;
    }
    // spread to a new object otherwise the component wouldn't re-render
    setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap });
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
            itemIdToExpandedRowMap[item.config.id]
              ? i18n.translate('xpack.ml.dataframe.jobsList.rowCollapse', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.ml.dataframe.jobsList.rowExpand', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.config.id] ? 'arrowUp' : 'arrowDown'}
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
      name: i18n.translate('xpack.ml.dataframe.tableActionLabel', { defaultMessage: 'Actions' }),
      actions,
    },
  ];
};
