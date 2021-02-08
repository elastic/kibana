/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseAttributesRt } from './case';
import { CommentResponseRt } from './comment';
import { SubCaseAttributesRt, SubCaseResponseRt } from './sub_case';

export const CollectionSubCaseAttributesRt = rt.intersection([
  rt.partial({ subCase: SubCaseAttributesRt }),
  rt.type({
    case: CaseAttributesRt,
  }),
]);

export const CollectWithSubCaseResponseRt = rt.intersection([
  CaseAttributesRt,
  rt.type({
    id: rt.string,
    totalComment: rt.number,
    version: rt.string,
  }),
  rt.partial({
    subCase: SubCaseResponseRt,
    totalAlerts: rt.number,
    comments: rt.array(CommentResponseRt),
  }),
]);

export type CollectionWithSubCaseResponse = rt.TypeOf<typeof CollectWithSubCaseResponseRt>;
export type CollectionWithSubCaseAttributes = rt.TypeOf<typeof CollectionSubCaseAttributesRt>;
