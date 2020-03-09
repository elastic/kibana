/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { IIndexPattern } from 'src/plugins/data/public';

import { useApi } from '../../../../hooks/use_api';

import { isDefaultQuery, matchAllQuery, EsDocSource, PivotQuery } from '../../../../common';

export enum SOURCE_INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

interface ErrorResponse {
  error: {
    body: string;
    msg: string;
    path: string;
    query: any;
    response: string;
    statusCode: number;
  };
}

const isErrorResponse = (arg: any): arg is ErrorResponse => {
  return arg.error !== undefined;
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

type SourceIndexSearchResponse = ErrorResponse | SearchResponse7;

export interface UseSourceIndexDataReturnType {
  errorMessage: string;
  status: SOURCE_INDEX_STATUS;
  rowCount: number;
  tableItems: EsDocSource[];
}

export const useSourceIndexData = (
  indexPattern: IIndexPattern,
  query: PivotQuery,
  pagination: { pageIndex: number; pageSize: number }
): UseSourceIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(SOURCE_INDEX_STATUS.UNUSED);
  const [rowCount, setRowCount] = useState(0);
  const [tableItems, setTableItems] = useState<EsDocSource[]>([]);
  const api = useApi();

  const getSourceIndexData = async function() {
    setErrorMessage('');
    setStatus(SOURCE_INDEX_STATUS.LOADING);

    try {
      const resp: SourceIndexSearchResponse = await api.esSearch({
        index: indexPattern.title,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        // Instead of using the default query (`*`), fall back to a more efficient `match_all` query.
        body: { query: isDefaultQuery(query) ? matchAllQuery : query },
      });

      if (isErrorResponse(resp)) {
        throw resp.error;
      }

      const docs = resp.hits.hits.map(d => d._source);

      setRowCount(resp.hits.total.value);
      setTableItems(docs);
      setStatus(SOURCE_INDEX_STATUS.LOADED);
    } catch (e) {
      if (e.message !== undefined) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage(JSON.stringify(e, null, 2));
      }
      setTableItems([]);
      setStatus(SOURCE_INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getSourceIndexData();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern.title, JSON.stringify(query), JSON.stringify(pagination)]);
  return { errorMessage, status, rowCount, tableItems };
};
