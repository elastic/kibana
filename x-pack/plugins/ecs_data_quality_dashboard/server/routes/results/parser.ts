/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ResultBody, ResultDocument, IndexArray, IndexObject } from '../../schemas/result';

export const createDocumentFromResult = ({ meta, data }: ResultBody): ResultDocument => {
  // convert objects with indexName as key to arrays so they can be stored in ES
  const results = indexObjectToIndexArray(data.results);
  const stats = indexObjectToIndexArray(data.stats);
  const ilmExplain = indexObjectToIndexArray(data.ilmExplain);

  const document: ResultDocument = {
    '@timestamp': Date.now(),
    meta,
    data: { ...data, ilmExplain, stats, results },
  };

  return document;
};

export const createResultFromDocument = (document: ResultDocument): ResultBody => {
  const { data } = document;
  // convert index arrays back to objects with indexName as key
  const results = indexArrayToIndexObject(data.results);
  const stats = indexArrayToIndexObject(data.stats);
  const ilmExplain = indexArrayToIndexObject(data.ilmExplain);

  const result = {
    ...document,
    data: { ...data, ilmExplain, stats, results },
  };

  return result;
};

const indexObjectToIndexArray = (obj: IndexObject): IndexArray =>
  Object.entries(obj).map(([key, value]) => ({ ...value, _indexName: key }));

const indexArrayToIndexObject = (arr: IndexArray): IndexObject =>
  Object.fromEntries(arr.map(({ _indexName, ...value }) => [_indexName, value]));
