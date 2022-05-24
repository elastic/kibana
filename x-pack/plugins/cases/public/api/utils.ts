/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, set, camelCase, isObject } from 'lodash';
import { CasesFindResponse, CaseResponse } from '../../common/api';
import { Cases, Case } from '../containers/types';

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

export const convertToCamelCase = <T, U extends {}>(obj: T): U =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertAllCasesToCamel = (snakeCases: CasesFindResponse): Cases => ({
  cases: snakeCases.cases.map((theCase) => convertToCamelCase<CaseResponse, Case>(theCase)),
  countOpenCases: snakeCases.count_open_cases,
  countInProgressCases: snakeCases.count_in_progress_cases,
  countClosedCases: snakeCases.count_closed_cases,
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});
