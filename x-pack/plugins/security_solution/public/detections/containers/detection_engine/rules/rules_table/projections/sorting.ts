/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { pipe } from 'fp-ts/lib/function';
import { orderBy } from 'lodash/fp';
import { Rule, FilterOptions } from '../../types';

export const useSortedRules = (rules: Rule[], options: FilterOptions): Rule[] => {
  return useMemo(
    () => pipe(rules, sortRules(options)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rules, options.sortField, options.sortOrder]
  );
};

const sortRules = (options: FilterOptions) => (rules: Rule[]): Rule[] => {
  const { sortField, sortOrder } = options;
  return orderBy([sortField], [sortOrder], rules);
};
