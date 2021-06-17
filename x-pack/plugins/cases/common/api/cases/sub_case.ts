/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { NumberFromString } from '../saved_object';
import { UserRT } from '../user';
import { CommentResponseRt } from './comment';
import { CaseStatusRt, CasesStatusResponseRt } from './status';

const SubCaseBasicRt = rt.type({
  /**
   * The status of the sub case (open, closed, in-progress)
   */
  status: CaseStatusRt,
});

export const SubCaseAttributesRt = rt.intersection([
  SubCaseBasicRt,
  rt.type({
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRT, rt.null]),
    created_at: rt.string,
    created_by: rt.union([UserRT, rt.null]),
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRT, rt.null]),
    owner: rt.string,
  }),
]);

export const SubCasesFindRequestRt = rt.partial({
  /**
   * The status of the sub case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * Operator to use for the `search` field
   */
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  /**
   * The fields in the entity to return in the response
   */
  fields: rt.array(rt.string),
  /**
   * The page of objects to return
   */
  page: NumberFromString,
  /**
   * The number of objects to include in each page
   */
  perPage: NumberFromString,
  /**
   * An Elasticsearch simple_query_string
   */
  search: rt.string,
  /**
   * The fields to perform the simple_query_string parsed query against
   */
  searchFields: rt.array(rt.string),
  /**
   * The field to use for sorting the found objects.
   */
  sortField: rt.string,
  /**
   * The order to sort by
   */
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
  owner: rt.string,
});

export const SubCaseResponseRt = rt.intersection([
  SubCaseAttributesRt,
  rt.type({
    id: rt.string,
    totalComment: rt.number,
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.partial({
    comments: rt.array(CommentResponseRt),
  }),
]);

export const SubCasesFindResponseRt = rt.intersection([
  rt.type({
    subCases: rt.array(SubCaseResponseRt),
    page: rt.number,
    per_page: rt.number,
    total: rt.number,
  }),
  CasesStatusResponseRt,
]);

export const SubCasePatchRequestRt = rt.intersection([
  rt.partial(SubCaseBasicRt.props),
  rt.type({ id: rt.string, version: rt.string }),
]);

export const SubCasesPatchRequestRt = rt.type({ subCases: rt.array(SubCasePatchRequestRt) });
export const SubCasesResponseRt = rt.array(SubCaseResponseRt);

export type SubCaseAttributes = rt.TypeOf<typeof SubCaseAttributesRt>;
export type SubCaseResponse = rt.TypeOf<typeof SubCaseResponseRt>;
export type SubCasesResponse = rt.TypeOf<typeof SubCasesResponseRt>;
export type SubCasesFindResponse = rt.TypeOf<typeof SubCasesFindResponseRt>;
export type SubCasePatchRequest = rt.TypeOf<typeof SubCasePatchRequestRt>;
export type SubCasesPatchRequest = rt.TypeOf<typeof SubCasesPatchRequestRt>;
export type SubCasesFindRequest = rt.TypeOf<typeof SubCasesFindRequestRt>;
