/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ResultBody, ResultDocument, IndexArray, IndexObject } from '../../schemas/result';

export const createDocumentFromResult = ({ meta, rollup }: ResultBody): ResultDocument => {
  // convert objects with indexName as key to arrays so they can be stored in ES
  const results = indexObjectToIndexArray(rollup.results);
  const stats = indexObjectToIndexArray(rollup.stats);
  const ilmExplain = indexObjectToIndexArray(rollup.ilmExplain);

  const document: ResultDocument = {
    '@timestamp': Date.now(),
    rollup: { ...rollup, ilmExplain, stats, results },
    meta,
  };

  return document;
};

export const createResultFromDocument = (document: ResultDocument): ResultBody => {
  const { rollup } = document;
  // convert index arrays back to objects with indexName as key
  const results = indexArrayToIndexObject(rollup.results);
  const stats = indexArrayToIndexObject(rollup.stats);
  const ilmExplain = indexArrayToIndexObject(rollup.ilmExplain);

  const result = {
    ...document,
    rollup: { ...rollup, ilmExplain, stats, results },
  };

  return result;
};

const indexObjectToIndexArray = (obj: IndexObject): IndexArray =>
  Object.entries(obj).map(([key, value]) => ({ ...value, _indexName: key }));

const indexArrayToIndexObject = (arr: IndexArray): IndexObject =>
  Object.fromEntries(arr.map(({ _indexName, ...value }) => [_indexName, value]));
