/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { EuiDataGridPaginationProps, EuiDataGridSorting } from '@elastic/eui';

import { SearchResponse } from 'elasticsearch';
import { cloneDeep } from 'lodash';

import { ml } from '../../../../../services/ml_api_service';
import { getNestedProperty } from '../../../../../util/object_utils';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { SORT_DIRECTION } from '../../../../../components/ml_in_memory_table';
import { SavedSearchQuery } from '../../../../../contexts/ml';

import {
  getDefaultFieldsFromJobCaps,
  getDependentVar,
  getFlattenedFields,
  getPredictedFieldName,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
} from '../../../../common';
import { Dictionary } from '../../../../../../../common/types/common';
import { isKeywordAndTextType } from '../../../../common/fields';
import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import {
  LoadExploreDataArg,
  defaultSearchQuery,
  ResultsSearchQuery,
  isResultsSearchBoolQuery,
} from '../../../../common/analytics';

export type TableItem = Record<string, any>;
type Pagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;

export interface UseExploreDataReturnType {
  errorMessage: string;
  fieldTypes: { [key: string]: ES_FIELD_TYPES };
  pagination: Pagination;
  rowCount: number;
  searchQuery: SavedSearchQuery;
  selectedFields: EsFieldName[];
  setFilterByIsTraining: Dispatch<SetStateAction<undefined | boolean>>;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
  setSelectedFields: Dispatch<SetStateAction<EsFieldName[]>>;
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
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

export const useExploreData = (
  jobConfig: DataFrameAnalyticsConfig,
  needsDestIndexFields: boolean
): UseExploreDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [tableFields, setTableFields] = useState<string[]>([]);
  const [tableItems, setTableItems] = useState<TableItem[]>([]);
  const [fieldTypes, setFieldTypes] = useState<{ [key: string]: ES_FIELD_TYPES }>({});
  const [rowCount, setRowCount] = useState(0);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
  const [filterByIsTraining, setFilterByIsTraining] = useState<undefined | boolean>(undefined);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const predictedFieldName = getPredictedFieldName(
    jobConfig.dest.results_field,
    jobConfig.analysis
  );
  const dependentVariable = getDependentVar(jobConfig.analysis);

  const getDefaultSelectedFields = () => {
    const { fields } = newJobCapsService;
    if (selectedFields.length === 0 && jobConfig !== undefined) {
      const { selectedFields: defaultSelected, docFields } = getDefaultFieldsFromJobCaps(
        fields,
        jobConfig,
        needsDestIndexFields
      );

      const types: { [key: string]: ES_FIELD_TYPES } = {};
      const allFields: string[] = [];

      docFields.forEach(field => {
        types[field.id] = field.type;
        allFields.push(field.id);
      });

      setFieldTypes(types);
      setSelectedFields(defaultSelected.map(field => field.id));
      setTableFields(allFields);
    }
  };

  const loadExploreData = async ({
    filterByIsTraining: isTraining,
    searchQuery: incomingQuery,
  }: LoadExploreDataArg) => {
    if (jobConfig !== undefined) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      try {
        const resultsField = jobConfig.dest.results_field;
        const searchQueryClone: ResultsSearchQuery = cloneDeep(incomingQuery);
        let query: ResultsSearchQuery;
        const { pageIndex, pageSize } = pagination;
        // If filterByIsTraining is defined - add that in to the final query
        const trainingQuery =
          isTraining !== undefined
            ? {
                term: { [`${resultsField}.is_training`]: { value: isTraining } },
              }
            : undefined;

        if (JSON.stringify(incomingQuery) === JSON.stringify(defaultSearchQuery)) {
          const existsQuery = {
            exists: {
              field: resultsField,
            },
          };

          query = {
            bool: {
              must: [existsQuery],
            },
          };

          if (trainingQuery !== undefined && isResultsSearchBoolQuery(query)) {
            query.bool.must.push(trainingQuery);
          }
        } else if (isResultsSearchBoolQuery(searchQueryClone)) {
          if (searchQueryClone.bool.must === undefined) {
            searchQueryClone.bool.must = [];
          }

          searchQueryClone.bool.must.push({
            exists: {
              field: resultsField,
            },
          });

          if (trainingQuery !== undefined) {
            searchQueryClone.bool.must.push(trainingQuery);
          }

          query = searchQueryClone;
        } else {
          query = searchQueryClone;
        }

        const sort: EsSorting = sortingColumns
          .map(column => {
            const { id } = column;
            column.id = isKeywordAndTextType(id) ? `${id}.keyword` : id;
            return column;
          })
          .reduce((s, column) => {
            s[column.id] = { order: column.direction };
            return s;
          }, {} as EsSorting);

        const resp: SearchResponse7 = await ml.esSearch({
          index: jobConfig.dest.index,
          body: {
            query,
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

        // Create a version of the doc's source with flattened field names.
        // This avoids confusion later on if a field name has dots in its name
        // or is a nested fields when displaying it via EuiInMemoryTable.
        const flattenedFields = getFlattenedFields(docs[0]._source, resultsField);
        const transformedTableItems = docs.map(doc => {
          const item: TableItem = {};
          flattenedFields.forEach(ff => {
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
  };

  useEffect(() => {
    getDefaultSelectedFields();
  }, [jobConfig && jobConfig.id]);

  // By default set sorting to descending on the prediction field (`<dependent_varible or prediction_field_name>_prediction`).
  useEffect(() => {
    const sortByField = isKeywordAndTextType(dependentVariable)
      ? `${predictedFieldName}.keyword`
      : predictedFieldName;
    const direction = SORT_DIRECTION.DESC;

    setSortingColumns([{ id: sortByField, direction }]);
  }, [jobConfig && jobConfig.id]);

  useEffect(() => {
    loadExploreData({ filterByIsTraining, searchQuery });
  }, [
    filterByIsTraining,
    jobConfig && jobConfig.id,
    pagination,
    searchQuery,
    selectedFields,
    sortingColumns,
  ]);

  return {
    errorMessage,
    fieldTypes,
    pagination,
    searchQuery,
    selectedFields,
    rowCount,
    setFilterByIsTraining,
    setPagination,
    setSelectedFields,
    setSortingColumns,
    setSearchQuery,
    sortingColumns,
    status,
    tableItems,
    tableFields,
  };
};
