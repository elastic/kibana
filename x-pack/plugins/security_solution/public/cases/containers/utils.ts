/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase, isArray, isObject, set } from 'lodash';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  CasesFindResponse,
  CasesFindResponseRt,
  CaseResponse,
  CaseResponseRt,
  CasesResponse,
  CasesResponseRt,
  CasesStatusResponseRt,
  CasesStatusResponse,
  throwErrors,
  CasesConfigureResponse,
  CaseConfigureResponseRt,
  CaseUserActionsResponse,
  CaseUserActionsResponseRt,
  ServiceConnectorCaseResponseRt,
  ServiceConnectorCaseResponse,
} from '../../../../case/common/api';
import { ToasterError } from '../../common/components/toasters';
import { AllCases, Case } from './types';

export const getTypedPayload = <T>(a: unknown): T => a as T;

export const parseString = (params: string) => {
  try {
    return JSON.parse(params);
  } catch {
    return null;
  }
};

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      return [...acc, convertArrayToCamelCase(value)];
    } else if (isObject(value)) {
      return [...acc, convertToCamelCase(value)];
    } else {
      return [...acc, value];
    }
  }, []);

export const convertToCamelCase = <T, U extends {}>(snakeCase: T): U =>
  Object.entries(snakeCase).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertAllCasesToCamel = (snakeCases: CasesFindResponse): AllCases => ({
  cases: snakeCases.cases.map((snakeCase) => convertToCamelCase<CaseResponse, Case>(snakeCase)),
  countClosedCases: snakeCases.count_closed_cases,
  countOpenCases: snakeCases.count_open_cases,
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});

export const decodeCasesStatusResponse = (respCase?: CasesStatusResponse) =>
  pipe(
    CasesStatusResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const createToasterPlainError = (message: string) => new ToasterError([message]);

export const decodeCaseResponse = (respCase?: CaseResponse) =>
  pipe(CaseResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesResponse = (respCase?: CasesResponse) =>
  pipe(CasesResponseRt.decode(respCase), fold(throwErrors(createToasterPlainError), identity));

export const decodeCasesFindResponse = (respCases?: CasesFindResponse) =>
  pipe(CasesFindResponseRt.decode(respCases), fold(throwErrors(createToasterPlainError), identity));

export const decodeCaseConfigureResponse = (respCase?: CasesConfigureResponse) =>
  pipe(
    CaseConfigureResponseRt.decode(respCase),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeCaseUserActionsResponse = (respUserActions?: CaseUserActionsResponse) =>
  pipe(
    CaseUserActionsResponseRt.decode(respUserActions),
    fold(throwErrors(createToasterPlainError), identity)
  );

export const decodeServiceConnectorCaseResponse = (respPushCase?: ServiceConnectorCaseResponse) =>
  pipe(
    ServiceConnectorCaseResponseRt.decode(respPushCase),
    fold(throwErrors(createToasterPlainError), identity)
  );
