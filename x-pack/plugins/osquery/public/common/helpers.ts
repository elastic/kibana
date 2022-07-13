/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash/fp';

import type {
  PaginationInputPaginated,
  FactoryQueryTypes,
  StrategyResponseType,
  Inspect,
} from '../../common/search_strategy';

import type { ESQuery } from '../../common/typed_json';
import type { ArrayItem } from '../shared_imports';

export const createFilter = (filterQuery: ESQuery | string | undefined) =>
  isString(filterQuery) ? filterQuery : JSON.stringify(filterQuery);

export type InspectResponse = Inspect & { response: string[] };

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;

  return {
    activePage,
    cursorStart,
    fakePossibleCount: 4 <= activePage && activePage > 0 ? limit * (activePage + 2) : limit * 5,
    querySize: limit,
  };
};

export const getInspectResponse = <T extends FactoryQueryTypes>(
  response: StrategyResponseType<T>,
  prevResponse: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  response:
    response != null ? [JSON.stringify(response.rawResponse, null, 2)] : prevResponse?.response,
});

export const prepareEcsFieldsToValidate = (ecsMapping: ArrayItem[]): string[] =>
  ecsMapping
    ?.map((_: unknown, index: number) => [
      `ecs_mapping[${index}].result.value`,
      `ecs_mapping[${index}].key`,
    ])
    .join(',')
    .split(',');
