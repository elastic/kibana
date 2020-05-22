/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';

import { SearchResponse } from 'elasticsearch';

import { EuiDataGridPaginationProps, EuiDataGridSorting } from '@elastic/eui';

import { IIndexPattern } from 'src/plugins/data/public';

import { Dictionary } from '../../../../../../common/types/common';

import { isDefaultQuery, matchAllQuery, EsDocSource, PivotQuery } from '../../../../common';
import { useApi } from '../../../../hooks/use_api';

export enum SOURCE_INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

interface ErrorResponse {
  request: Dictionary<any>;
  response: Dictionary<any>;
  body: {
    statusCode: number;
    error: string;
    message: string;
  };
  name: string;
  req: Dictionary<any>;
  res: Dictionary<any>;
}

const isErrorResponse = (arg: any): arg is ErrorResponse => {
  return arg?.body?.error !== undefined && arg?.body?.message !== undefined;
};

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

type SourceIndexSearchResponse = SearchResponse7;

type SourceIndexPagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;
const defaultPagination: SourceIndexPagination = { pageIndex: 0, pageSize: 5 };

export interface UseSourceIndexDataReturnType {
  errorMessage: string;
  pagination: SourceIndexPagination;
  setPagination: Dispatch<SetStateAction<SourceIndexPagination>>;
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  rowCount: number;
  sortingColumns: EuiDataGridSorting['columns'];
  status: SOURCE_INDEX_STATUS;
  tableItems: EsDocSource[];
}

export const useSourceIndexData = (
  indexPattern: IIndexPattern,
  query: PivotQuery
): UseSourceIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(SOURCE_INDEX_STATUS.UNUSED);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [rowCount, setRowCount] = useState(0);
  const [tableItems, setTableItems] = useState<EsDocSource[]>([]);
  const api = useApi();

  useEffect(() => {
    setPagination(defaultPagination);
  }, [query]);

  const getSourceIndexData = async function () {
    setErrorMessage('');
    setStatus(SOURCE_INDEX_STATUS.LOADING);

    const sort: EsSorting = sortingColumns.reduce((s, column) => {
      s[column.id] = { order: column.direction };
      return s;
    }, {} as EsSorting);

    const esSearchRequest = {
      index: indexPattern.title,
      body: {
        // Instead of using the default query (`*`), fall back to a more efficient `match_all` query.
        query: isDefaultQuery(query) ? matchAllQuery : query,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
      },
    };

    try {
      const resp: SourceIndexSearchResponse = await api.esSearch(esSearchRequest);

      const docs = resp.hits.hits.map((d) => d._source);

      setRowCount(resp.hits.total.value);
      setTableItems(docs);
      setStatus(SOURCE_INDEX_STATUS.LOADED);
    } catch (e) {
      if (isErrorResponse(e)) {
        setErrorMessage(`${e.body.error}: ${e.body.message}`);
      } else {
        setErrorMessage(JSON.stringify(e, null, 2));
      }
      setStatus(SOURCE_INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getSourceIndexData();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern.title, JSON.stringify([query, pagination, sortingColumns])]);
  return {
    errorMessage,
    pagination,
    setPagination,
    setSortingColumns,
    rowCount,
    sortingColumns,
    status,
    tableItems,
  };
};
