/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { SearchResponse7 } from '../../../../common/types/es_client';
import { extractErrorMessage } from '../../../../common/util/errors';

import { EsSorting, UseDataGridReturnType, getProcessedFields } from '../../components/data_grid';
import { ml } from '../../services/ml_api_service';

import { isKeywordAndTextType } from '../common/fields';
import { SavedSearchQuery } from '../../contexts/ml';

import { INDEX_STATUS } from './analytics';
import { DataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';

export const getIndexData = async (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  dataGrid: UseDataGridReturnType,
  searchQuery: SavedSearchQuery,
  options: { didCancel: boolean }
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
      // TODO: remove results_field from `fields` when possible
      const resp: SearchResponse7 = await ml.esSearch({
        index: jobConfig.dest.index,
        body: {
          fields: ['*'],
          _source: false,
          query: searchQuery,
          from: pageIndex * pageSize,
          size: pageSize,
          ...(Object.keys(sort).length > 0 ? { sort } : {}),
        },
      });

      if (!options.didCancel) {
        setRowCount(resp.hits.total.value);
        setTableItems(
          resp.hits.hits.map((d) =>
            getProcessedFields(d.fields, (key: string) =>
              key.startsWith(`${jobConfig.dest.results_field}.feature_importance`)
            )
          )
        );
        setStatus(INDEX_STATUS.LOADED);
      }
    } catch (e) {
      setErrorMessage(extractErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  }
};
