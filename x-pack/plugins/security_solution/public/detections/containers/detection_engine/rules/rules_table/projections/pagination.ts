/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { pipe } from 'fp-ts/lib/function';
import { drop, take } from 'lodash/fp';
import { Rule, PaginationOptions } from '../../types';

export const useDisplayedPaginationOptions = (
  filteredRules: Rule[],
  options: PaginationOptions
): PaginationOptions => {
  return useMemo(() => {
    return {
      page: options.page,
      perPage: options.perPage,
      total: filteredRules.length,
    };
  }, [filteredRules, options.page, options.perPage]);
};

export const usePaginatedRules = (rules: Rule[], options: PaginationOptions): Rule[] => {
  return useMemo(
    () => pipe(rules, paginateRules(options)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rules, options.page, options.perPage]
  );
};

const paginateRules = (options: PaginationOptions) => (rules: Rule[]): Rule[] => {
  const { page, perPage } = options;
  return pipe(rules, drop(perPage * (page - 1)), take(perPage));
};
