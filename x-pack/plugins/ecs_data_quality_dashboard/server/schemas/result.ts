/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { StringToPositiveNumber } from '@kbn/securitysolution-io-ts-types';

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
  incompatibleFieldMappingItems: t.array(
    t.type({
      fieldName: t.string,
      expectedValue: t.string,
      actualValue: t.string,
      description: t.string,
    })
  ),
  incompatibleFieldValueItems: t.array(
    t.type({
      fieldName: t.string,
      expectedValues: t.array(t.string),
      actualValues: t.array(t.type({ name: t.string, count: t.number })),
      description: t.string,
    })
  ),
  sameFamilyFieldCount: t.number,
  sameFamilyFields: t.array(t.string),
  sameFamilyFieldItems: t.array(
    t.type({
      fieldName: t.string,
      expectedValue: t.string,
      actualValue: t.string,
      description: t.string,
    })
  ),
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

export const PostIndexResultBody = ResultDocument;

export const GetIndexResultsLatestParams = t.type({ pattern: t.string });
export type GetIndexResultsLatestParams = t.TypeOf<typeof GetIndexResultsLatestParams>;

export const GetIndexResultsParams = t.type({
  pattern: t.string,
});

export const GetIndexResultsQuery = t.partial({
  size: StringToPositiveNumber,
  from: StringToPositiveNumber,
  startDate: t.string,
  endDate: t.string,
  outcome: t.union([t.literal('pass'), t.literal('fail')]),
});
