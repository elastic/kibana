/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import { fetchRuleById } from './api';
import { transformInput } from './transforms';
import * as i18n from './translations';
import { Rule } from './types';

export type ReturnRule = [boolean, Rule | null];

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 *
 */
export const useRule = (id: string | undefined): ReturnRule => {
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (idToFetch: string) => {
      try {
        setLoading(true);
        const ruleResponse = transformInput(
          await fetchRuleById({
            id: idToFetch,
            signal: abortCtrl.signal,
          })
        );
        if (isSubscribed) {
          setRule(ruleResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setRule(null);
          addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };
    if (id != null) {
      fetchData(id);
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [id, addError]);

  return [loading, rule];
};
