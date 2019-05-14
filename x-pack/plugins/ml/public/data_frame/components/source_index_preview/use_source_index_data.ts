/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { ml } from '../../../services/ml_api_service';

import { SimpleQuery } from '../../common';
import { EsDoc, EsFieldName, getDefaultSelectableFields } from './common';

const SEARCH_SIZE = 1000;

export enum SOURCE_INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface UseSourceIndexDataReturnType {
  errorMessage: string;
  status: SOURCE_INDEX_STATUS;
  tableItems: EsDoc[];
}

export const useSourceIndexData = (
  indexPattern: StaticIndexPattern,
  query: SimpleQuery,
  selectedFields: EsFieldName[],
  setSelectedFields: React.Dispatch<React.SetStateAction<EsFieldName[]>>
): UseSourceIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(SOURCE_INDEX_STATUS.UNUSED);
  const [tableItems, setTableItems] = useState([] as EsDoc[]);

  const getSourceIndexData = async function() {
    setErrorMessage('');
    setStatus(SOURCE_INDEX_STATUS.LOADING);

    try {
      const resp: SearchResponse<any> = await ml.esSearch({
        index: indexPattern.title,
        size: SEARCH_SIZE,
        body: { query },
      });

      const docs = resp.hits.hits;

      if (selectedFields.length === 0) {
        const newSelectedFields = getDefaultSelectableFields(docs);
        setSelectedFields(newSelectedFields);
      }

      setTableItems(docs as EsDoc[]);
      setStatus(SOURCE_INDEX_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(JSON.stringify(e));
      setTableItems([] as EsDoc[]);
      setStatus(SOURCE_INDEX_STATUS.ERROR);
    }
  };

  useEffect(
    () => {
      getSourceIndexData();
    },
    [indexPattern.title, query.query_string.query]
  );
  return { errorMessage, status, tableItems };
};
