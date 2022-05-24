/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { extractErrorMessage } from '../../../../common/util/errors';

import { EsSorting, UseDataGridReturnType, getProcessedFields } from '../../components/data_grid';
import { ml } from '../../services/ml_api_service';

import { isKeywordAndTextType } from './fields';
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
      setRowCountRelation,
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
      const resp: estypes.SearchResponse = await ml.esSearch({
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
        setRowCount(typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total!.value);
        setRowCountRelation(
          typeof resp.hits.total === 'number'
            ? ('eq' as estypes.SearchTotalHitsRelation)
            : resp.hits.total!.relation
        );
        setTableItems(
          resp.hits.hits.map((d) =>
            getProcessedFields(
              d.fields ?? {},
              (key: string) =>
                key.startsWith(`${jobConfig.dest.results_field}.feature_importance`) ||
                key.startsWith(`${jobConfig.dest.results_field}.feature_influence`)
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
