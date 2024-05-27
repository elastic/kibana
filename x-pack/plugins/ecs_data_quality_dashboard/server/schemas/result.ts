/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const ResultDocumentInterface = t.interface({
  batchId: t.string,
  indexName: t.string,
  isCheckAll: t.boolean,
  checkedAt: t.number,
  docsCount: t.number,
  totalFieldCount: t.number,
  ecsFieldCount: t.number,
  customFieldCount: t.number,
  incompatibleFieldCount: t.number,
  sameFamilyFieldCount: t.number,
  sameFamilyFields: t.array(t.string),
  unallowedMappingFields: t.array(t.string),
  unallowedValueFields: t.array(t.string),
  sizeInBytes: t.number,
  markdownComments: t.array(t.string),
  ecsVersion: t.string,
  error: t.union([t.string, t.null]),
});

const ResultDocumentOptional = t.partial({
  indexPattern: t.string,
  checkedBy: t.string,
  indexId: t.string,
  ilmPhase: t.string,
});

export const ResultDocument = t.intersection([ResultDocumentInterface, ResultDocumentOptional]);
export type ResultDocument = t.TypeOf<typeof ResultDocument>;

export const PostResultBody = ResultDocument;

export const GetResultsIndicesLatestParams = t.type({ pattern: t.string });
export type GetResultsIndicesLatestParams = t.TypeOf<typeof GetResultsIndicesLatestParams>;

export const GetResultsIndicesPatternParams = t.type({
  pattern: t.string,
});

export const GetResultsIndicesPatternQuery = t.type({
  limit: t.union([t.number, t.undefined]),
  from: t.union([t.number, t.undefined]),
  startDate: t.union([t.string, t.undefined]),
  endDate: t.union([t.string, t.undefined]),
  outcome: t.union([t.literal('pass'), t.literal('fail'), t.undefined]),
});
