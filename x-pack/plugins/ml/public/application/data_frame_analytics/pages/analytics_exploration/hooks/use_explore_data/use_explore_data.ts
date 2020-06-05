/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { SearchResponse } from 'elasticsearch';

import { EuiDataGridPaginationProps, EuiDataGridSorting } from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { Dictionary } from '../../../../../../../common/types/common';

import { SavedSearchQuery } from '../../../../../contexts/ml';
import { ml } from '../../../../../services/ml_api_service';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { getIndexPatternIdFromName } from '../../../../../util/index_utils';
import { getNestedProperty } from '../../../../../util/object_utils';
import { useMlContext } from '../../../../../contexts/ml';
import { isGetDataFrameAnalyticsStatsResponseOk } from '../../../analytics_management/services/analytics_service/get_analytics';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
  MAX_COLUMNS,
  defaultSearchQuery,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import { getOutlierScoreFieldName } from './common';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';

export type TableItem = Record<string, any>;

type Pagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;

interface UseExploreDataReturnType {
  errorMessage: string;
  indexPattern: IndexPattern | undefined;
  jobConfig: DataFrameAnalyticsConfig | undefined;
  jobStatus: DATA_FRAME_TASK_STATE | undefined;
  pagination: Pagination;
  searchQuery: SavedSearchQuery;
  selectedFields: EsFieldName[];
  setJobConfig: Dispatch<SetStateAction<DataFrameAnalyticsConfig | undefined>>;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
  setSelectedFields: Dispatch<SetStateAction<EsFieldName[]>>;
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  rowCount: number;
  sortingColumns: EuiDataGridSorting['columns'];
  status: INDEX_STATUS;
  tableFields: string[];
  tableItems: TableItem[];
}

type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

export const useExploreData = (jobId: string): UseExploreDataReturnType => {
  const mlContext = useMlContext();

  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>(undefined);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<DATA_FRAME_TASK_STATE | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [tableFields, setTableFields] = useState<string[]>([]);
  const [tableItems, setTableItems] = useState<TableItem[]>([]);
  const [rowCount, setRowCount] = useState(0);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  // get analytics configuration
  useEffect(() => {
    (async function () {
      const analyticsConfigs = await ml.dataFrameAnalytics.getDataFrameAnalytics(jobId);
      const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);
      const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
        ? analyticsStats.data_frame_analytics[0]
        : undefined;

      if (stats !== undefined && stats.state) {
        setJobStatus(stats.state);
      }

      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  // get index pattern and field caps
  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        try {
          const destIndex = Array.isArray(jobConfig.dest.index)
            ? jobConfig.dest.index[0]
            : jobConfig.dest.index;
          const destIndexPatternId = getIndexPatternIdFromName(destIndex) || destIndex;
          let indexP: IndexPattern | undefined;

          try {
            indexP = await mlContext.indexPatterns.get(destIndexPatternId);
          } catch (e) {
            indexP = undefined;
          }

          if (indexP === undefined) {
            const sourceIndex = jobConfig.source.index[0];
            const sourceIndexPatternId = getIndexPatternIdFromName(sourceIndex) || sourceIndex;
            indexP = await mlContext.indexPatterns.get(sourceIndexPatternId);
          }

          if (indexP !== undefined) {
            setIndexPattern(indexP);
            await newJobCapsService.initializeFromIndexPattern(indexP, false, false);
          }
        } catch (e) {
          // eslint-disable-next-line
          console.log('Error loading index field data', e);
        }
      }
    })();
  }, [jobConfig && jobConfig.id]);

  // initialize sorting: reverse sort on outlier score column
  useEffect(() => {
    if (jobConfig !== undefined) {
      setSortingColumns([{ id: getOutlierScoreFieldName(jobConfig), direction: 'desc' }]);
    }
  }, [jobConfig && jobConfig.id]);

  // update data grid data
  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        setErrorMessage('');
        setStatus(INDEX_STATUS.LOADING);

        try {
          const resultsField = jobConfig.dest.results_field;

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

          const docs = resp.hits.hits;

          if (docs.length === 0) {
            setTableItems([]);
            setStatus(INDEX_STATUS.LOADED);
            return;
          }

          if (selectedFields.length === 0) {
            const newSelectedFields = getDefaultSelectableFields(docs, resultsField);
            setSelectedFields(newSelectedFields.sort().splice(0, MAX_COLUMNS));
          }

          // Create a version of the doc's source with flattened field names.
          // This avoids confusion later on if a field name has dots in its name
          // or is a nested fields when displaying it via EuiInMemoryTable.
          const flattenedFields = getFlattenedFields(docs[0]._source, resultsField);
          const transformedTableItems = docs.map((doc) => {
            const item: TableItem = {};
            flattenedFields.forEach((ff) => {
              item[ff] = getNestedProperty(doc._source, ff);
              if (item[ff] === undefined) {
                // If the attribute is undefined, it means it was not a nested property
                // but had dots in its actual name. This selects the property by its
                // full name and assigns it to `item[ff]`.
                item[ff] = doc._source[`"${ff}"`];
              }
              if (item[ff] === undefined) {
                const parts = ff.split('.');
                if (parts[0] === resultsField && parts.length >= 2) {
                  parts.shift();
                  if (doc._source[resultsField] !== undefined) {
                    item[ff] = doc._source[resultsField][parts.join('.')];
                  }
                }
              }
            });
            return item;
          });

          setTableFields(flattenedFields);
          setTableItems(transformedTableItems);
          setStatus(INDEX_STATUS.LOADED);
        } catch (e) {
          if (e.message !== undefined) {
            setErrorMessage(e.message);
          } else {
            setErrorMessage(JSON.stringify(e));
          }
          setTableItems([]);
          setStatus(INDEX_STATUS.ERROR);
        }
      }
    })();
  }, [jobConfig && jobConfig.id, pagination, searchQuery, selectedFields, sortingColumns]);

  return {
    errorMessage,
    indexPattern,
    jobConfig,
    jobStatus,
    pagination,
    rowCount,
    searchQuery,
    selectedFields,
    setJobConfig,
    setPagination,
    setSearchQuery,
    setSelectedFields,
    setSortingColumns,
    sortingColumns,
    status,
    tableFields,
    tableItems,
  };
};
