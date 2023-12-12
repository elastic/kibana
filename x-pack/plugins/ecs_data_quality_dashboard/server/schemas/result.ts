/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ResultsMeta = t.type({
  batchId: t.string,
  ecsVersion: t.string,
  errorCount: t.number,
  ilmPhase: t.string,
  indexId: t.string,
  indexName: t.string,
  isCheckAll: t.boolean,
  numberOfDocuments: t.number,
  numberOfIncompatibleFields: t.number,
  numberOfIndices: t.number,
  numberOfIndicesChecked: t.number,
  numberOfSameFamily: t.number,
  sameFamilyFields: t.array(t.string),
  sizeInBytes: t.number,
  timeConsumedMs: t.number,
  unallowedMappingFields: t.array(t.string),
  unallowedValueFields: t.array(t.string),
});
export type ResultsMeta = t.TypeOf<typeof ResultsMeta>;

export const ResultsData = t.type({
  docsCount: t.number,
  error: t.union([t.string, t.null]),
  indices: t.number,
  pattern: t.string,
  sizeInBytes: t.number,
  ilmExplainPhaseCounts: t.record(t.string, t.number),
  ilmExplain: t.record(t.string, t.UnknownRecord),
  stats: t.record(t.string, t.UnknownRecord),
  results: t.record(t.string, t.UnknownRecord),
});
export type ResultsData = t.TypeOf<typeof ResultsData>;

export const ResultBody = t.type({
  meta: ResultsMeta,
  data: ResultsData,
});
export type ResultBody = t.TypeOf<typeof ResultBody>;

export type IndexArray = Array<{ _indexName: string } & Record<string, unknown>>;
export type IndexObject = Record<string, Record<string, unknown>>;

export type ResultDocument = Omit<ResultBody, 'data'> & {
  '@timestamp': number;
  data: Omit<ResultsData, 'stats' | 'results' | 'ilmExplain'> & {
    stats: IndexArray;
    results: IndexArray;
    ilmExplain: IndexArray;
  };
};
