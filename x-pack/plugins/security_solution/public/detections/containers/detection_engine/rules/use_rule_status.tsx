/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { RuleStatusRowItemType } from '../../../pages/detection_engine/rules/all/columns';
import { getRuleStatusById, getRulesStatusByIds } from './api';
import * as i18n from './translations';
import { RuleStatus, Rules } from './types';

type Func = (ruleId: string) => void;
export type ReturnRuleStatus = [boolean, RuleStatus | null, Func | null];
export interface ReturnRulesStatuses {
  loading: boolean;
  rulesStatuses: RuleStatusRowItemType[];
}

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 *
 */
export const useRuleStatus = (id: string | undefined | null): ReturnRuleStatus => {
  const [ruleStatus, setRuleStatus] = useState<RuleStatus | null>(null);
  const fetchRuleStatus = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (idToFetch: string) => {
      try {
        setLoading(true);
        const ruleStatusResponse = await getRuleStatusById({
          id: idToFetch,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRuleStatus(ruleStatusResponse[id ?? '']);
        }
      } catch (error) {
        if (isSubscribed) {
          setRuleStatus(null);
          errorToToaster({ title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };
    if (id != null) {
      fetchData(id);
    }
    fetchRuleStatus.current = fetchData;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return [loading, ruleStatus, fetchRuleStatus.current];
};

/**
 * Hook for using to get all the statuses for all given rule ids
 *
 * @param ids desired Rule ID's (not rule_id)
 *
 */
export const useRulesStatuses = (rules: Rules): ReturnRulesStatuses => {
  const [rulesStatuses, setRuleStatuses] = useState<RuleStatusRowItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (ids: string[]) => {
      try {
        setLoading(true);
        const ruleStatusesResponse = await getRulesStatusByIds({
          ids,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRuleStatuses(
            rules.map((rule) => ({
              id: rule.id,
              activate: rule.enabled,
              name: rule.name,
              ...ruleStatusesResponse[rule.id],
            }))
          );
        }
      } catch (error) {
        if (isSubscribed) {
          setRuleStatuses([]);
          errorToToaster({ title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };
    if (rules != null && rules.length > 0) {
      fetchData(rules.map((r) => r.id));
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  return { loading, rulesStatuses };
};
