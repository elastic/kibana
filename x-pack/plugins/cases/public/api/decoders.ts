/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { createToasterPlainError } from '../containers/utils';
import { throwErrors } from '../../common';
import type {
  CasesFindResponse,
  CasesStatusResponse,
  CasesMetricsResponse,
  CasesBulkGetResponseCertainFields,
  Case,
} from '../../common/api';
import {
  CasesFindResponseRt,
  CasesStatusResponseRt,
  CasesRt,
  getTypeForCertainFieldsFromArray,
  CasesMetricsResponseRt,
} from '../../common/api';

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  pipe(CasesFindResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesStatusResponse = (respCase?: CasesStatusResponse) =>
  pipe(
    CasesStatusResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesMetricsResponse = (metrics?: CasesMetricsResponse) =>
  pipe(
    CasesMetricsResponseRt.decode(metrics),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCasesBulkGetResponse = <Field extends keyof Case = keyof Case>(
  res: CasesBulkGetResponseCertainFields<Field>,
  fields?: string[]
) => {
  const typeToDecode = getTypeForCertainFieldsFromArray(CasesRt, fields);
  pipe(typeToDecode.decode(res.cases), fold(throwErrors(createToasterPlainError), identity));

  return res;
};
