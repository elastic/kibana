/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getErrorMessage } from '../../../../common/util/errors';

import { EsSorting, SearchResponse7, UseDataGridReturnType } from '../../components/data_grid';
import { ml } from '../../services/ml_api_service';

import { isKeywordAndTextType } from '../common/fields';
import { SavedSearchQuery } from '../../contexts/ml';

import { INDEX_STATUS } from './analytics';
import { DataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';

export const getIndexData = async (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  dataGrid: UseDataGridReturnType,
  searchQuery: SavedSearchQuery
) => {
  if (jobConfig !== undefined) {
    const {
      pagination,
      setErrorMessage,
      setRowCount,
      setStatus,
      setTableItems,
      sortingColumns,
    } = dataGrid;

    setErrorMessage('');
    setStatus(INDEX_STATUS.LOADING);

    try {
      const sort: EsSorting = sortingColumns
        .map((column) => {
          const { id } = column;
          column.id = isKeywordAndTextType(id) ? `${id}.keyword` : id;
          return column;
        })
        .reduce((s, column) => {
          s[column.id] = { order: column.direction };
          return s;
        }, {} as EsSorting);

      const { pageIndex, pageSize } = pagination;
      const resp: SearchResponse7 = await ml.esSearch({
        index: jobConfig.dest.index,
        body: {
          query: searchQuery,
          from: pageIndex * pageSize,
          size: pageSize,
          ...(Object.keys(sort).length > 0 ? { sort } : {}),
        },
      });

      setRowCount(resp.hits.total.value);

      const docs = resp.hits.hits.map((d) => d._source);
      setTableItems(docs);
      setStatus(INDEX_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  }
};
