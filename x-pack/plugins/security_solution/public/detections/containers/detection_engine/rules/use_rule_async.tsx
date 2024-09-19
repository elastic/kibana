/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';

import { flow } from 'fp-ts/lib/function';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useHttp } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { pureFetchRuleById } from './api';
import { Rule } from './types';
import * as i18n from './translations';
import { transformInput } from './transforms';

export interface UseRuleAsync {
  error: unknown;
  loading: boolean;
  refresh: () => void;
  rule: Rule | null;
}

const _fetchRule = flow(withOptionalSignal(pureFetchRuleById), async (rule: Promise<Rule>) =>
  transformInput(await rule)
);

/** This does not use "_useRuleAsyncInternal" as that would deactivate the useHooks linter rule, so instead it has the word "Internal" post-pended  */
const useRuleAsyncInternal = () => useAsync(_fetchRule);

export const useRuleAsync = (ruleId: string): UseRuleAsync => {
  const { start, loading, result, error } = useRuleAsyncInternal();
  const http = useHttp();
  const { addError } = useAppToasts();

  const fetch = useCallback(() => {
    start({ id: ruleId, http });
  }, [http, ruleId, start]);

  // initial fetch
  useEffect(() => {
    fetch();
  }, [fetch]);

  // toast on error
  useEffect(() => {
    if (error != null) {
      addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    }
  }, [addError, error]);

  return { error, loading, refresh: fetch, rule: result ?? null };
};
