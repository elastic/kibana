/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ResultMeta = t.type({
  batchId: t.string,
  ecsVersion: t.string,
  errorCount: t.number,
  ilmPhase: t.string,
  indexId: t.string,
  indexName: t.string,
  isCheckAll: t.boolean,
  numberOfDocuments: t.number,
  numberOfFields: t.number,
  numberOfIncompatibleFields: t.number,
  numberOfEcsFields: t.number,
  numberOfCustomFields: t.number,
  numberOfIndices: t.number,
  numberOfIndicesChecked: t.number,
  numberOfSameFamily: t.number,
  sameFamilyFields: t.array(t.string),
  sizeInBytes: t.number,
  timeConsumedMs: t.number,
  unallowedMappingFields: t.array(t.string),
  unallowedValueFields: t.array(t.string),
});
export type ResultMeta = t.TypeOf<typeof ResultMeta>;

export const ResultRollup = t.type({
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
export type ResultRollup = t.TypeOf<typeof ResultRollup>;

export const Result = t.type({
  meta: ResultMeta,
  rollup: ResultRollup,
});
export type Result = t.TypeOf<typeof Result>;

export type IndexArray = Array<{ _indexName: string } & Record<string, unknown>>;
export type IndexObject = Record<string, Record<string, unknown>>;

export type ResultDocument = Omit<Result, 'rollup'> & {
  '@timestamp': number;
  rollup: Omit<ResultRollup, 'stats' | 'results' | 'ilmExplain'> & {
    stats: IndexArray;
    results: IndexArray;
    ilmExplain: IndexArray;
  };
};

// Routes validation schemas

export const GetResultQuery = t.type({ patterns: t.string });
export type GetResultQuery = t.TypeOf<typeof GetResultQuery>;

export const PostResultBody = Result;
