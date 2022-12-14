/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { FindRulesQueryArgs } from '../api/hooks/use_find_rules_query';
import { useFindRulesQuery } from '../api/hooks/use_find_rules_query';
import * as i18n from './translations';
import type { Rule } from './types';

export interface RulesQueryData {
  rules: Rule[];
  total: number;
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param requestArgs - fetch rules filters/pagination
 * @param options - react-query options
 * @returns useQuery result
 */
export const useFindRules = (
  requestArgs: FindRulesQueryArgs,
  options: UseQueryOptions<RulesQueryData, Error, RulesQueryData, [...string[], FindRulesQueryArgs]>
) => {
  const { addError } = useAppToasts();

  return useFindRulesQuery(requestArgs, {
    onError: (error: Error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
    ...options,
  });
};
