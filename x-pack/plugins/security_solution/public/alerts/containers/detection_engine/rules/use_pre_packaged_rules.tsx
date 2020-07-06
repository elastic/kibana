/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import {
  errorToToaster,
  useStateToaster,
  displaySuccessToast,
} from '../../../../common/components/toasters';
import { getPrePackagedRulesStatus, createPrepackagedRules } from './api';
import * as i18n from './translations';

type Func = () => void;
export type CreatePreBuiltRules = () => Promise<boolean>;
export interface ReturnPrePackagedRules {
  createPrePackagedRules: null | CreatePreBuiltRules;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: Func | null;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
}

interface UsePrePackagedRuleProps {
  canUserCRUD: boolean | null;
  hasIndexWrite: boolean | null;
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  isSignalIndexExists: boolean | null;
}

/**
 * Hook for using to get status about pre-packaged Rules from the Detection Engine API
 *
 * @param hasIndexWrite boolean
 * @param isAuthenticated boolean
 * @param hasEncryptionKey boolean
 * @param isSignalIndexExists boolean
 *
 */
export const usePrePackagedRules = ({
  canUserCRUD,
  hasIndexWrite,
  isAuthenticated,
  hasEncryptionKey,
  isSignalIndexExists,
}: UsePrePackagedRuleProps): ReturnPrePackagedRules => {
  const [rulesStatus, setRuleStatus] = useState<
    Pick<
      ReturnPrePackagedRules,
      | 'createPrePackagedRules'
      | 'refetchPrePackagedRulesStatus'
      | 'rulesCustomInstalled'
      | 'rulesInstalled'
      | 'rulesNotInstalled'
      | 'rulesNotUpdated'
    >
  >({
    createPrePackagedRules: null,
    refetchPrePackagedRulesStatus: null,
    rulesCustomInstalled: null,
    rulesInstalled: null,
    rulesNotInstalled: null,
    rulesNotUpdated: null,
  });
  const [loadingCreatePrePackagedRules, setLoadingCreatePrePackagedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchPrePackagedRules = async () => {
      try {
        setLoading(true);
        const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRuleStatus({
            createPrePackagedRules: createElasticRules,
            refetchPrePackagedRulesStatus: fetchPrePackagedRules,
            rulesCustomInstalled: prePackagedRuleStatusResponse.rules_custom_installed,
            rulesInstalled: prePackagedRuleStatusResponse.rules_installed,
            rulesNotInstalled: prePackagedRuleStatusResponse.rules_not_installed,
            rulesNotUpdated: prePackagedRuleStatusResponse.rules_not_updated,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setRuleStatus({
            createPrePackagedRules: null,
            refetchPrePackagedRulesStatus: null,
            rulesCustomInstalled: null,
            rulesInstalled: null,
            rulesNotInstalled: null,
            rulesNotUpdated: null,
          });
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    const createElasticRules = async (): Promise<boolean> => {
      return new Promise(async (resolve) => {
        try {
          if (
            canUserCRUD &&
            hasIndexWrite &&
            isAuthenticated &&
            hasEncryptionKey &&
            isSignalIndexExists
          ) {
            setLoadingCreatePrePackagedRules(true);
            await createPrepackagedRules({
              signal: abortCtrl.signal,
            });

            if (isSubscribed) {
              let iterationTryOfFetchingPrePackagedCount = 0;
              let timeoutId = -1;
              const stopTimeOut = () => {
                if (timeoutId !== -1) {
                  window.clearTimeout(timeoutId);
                }
              };
              const reFetch = () =>
                window.setTimeout(async () => {
                  iterationTryOfFetchingPrePackagedCount =
                    iterationTryOfFetchingPrePackagedCount + 1;
                  const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
                    signal: abortCtrl.signal,
                  });
                  if (
                    isSubscribed &&
                    ((prePackagedRuleStatusResponse.rules_not_installed === 0 &&
                      prePackagedRuleStatusResponse.rules_not_updated === 0) ||
                      iterationTryOfFetchingPrePackagedCount > 100)
                  ) {
                    setLoadingCreatePrePackagedRules(false);
                    setRuleStatus({
                      createPrePackagedRules: createElasticRules,
                      refetchPrePackagedRulesStatus: fetchPrePackagedRules,
                      rulesCustomInstalled: prePackagedRuleStatusResponse.rules_custom_installed,
                      rulesInstalled: prePackagedRuleStatusResponse.rules_installed,
                      rulesNotInstalled: prePackagedRuleStatusResponse.rules_not_installed,
                      rulesNotUpdated: prePackagedRuleStatusResponse.rules_not_updated,
                    });
                    displaySuccessToast(i18n.RULE_PREPACKAGED_SUCCESS, dispatchToaster);
                    stopTimeOut();
                    resolve(true);
                  } else {
                    timeoutId = reFetch();
                  }
                }, 300);
              timeoutId = reFetch();
            }
          } else {
            resolve(false);
          }
        } catch (error) {
          if (isSubscribed) {
            setLoadingCreatePrePackagedRules(false);
            errorToToaster({ title: i18n.RULE_PREPACKAGED_FAILURE, error, dispatchToaster });
            resolve(false);
          }
        }
      });
    };

    fetchPrePackagedRules();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUserCRUD, hasIndexWrite, isAuthenticated, hasEncryptionKey, isSignalIndexExists]);

  return {
    loading,
    loadingCreatePrePackagedRules,
    ...rulesStatus,
  };
};
