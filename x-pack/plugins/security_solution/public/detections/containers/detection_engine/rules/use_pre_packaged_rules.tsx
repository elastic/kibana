/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiButton } from '@elastic/eui';

import {
  errorToToaster,
  useStateToaster,
  displaySuccessToast,
} from '../../../../common/components/toasters';
import { getPrePackagedRulesStatus, createPrepackagedRules } from './api';
import * as i18n from './translations';

import {
  getPrePackagedRuleStatus,
  getPrePackagedTimelineStatus,
} from '../../../pages/detection_engine/rules/helpers';

type Func = () => Promise<void>;
export type CreatePreBuiltRules = () => Promise<boolean>;

interface ReturnPrePackagedTimelines {
  timelinesInstalled: number | null;
  timelinesNotInstalled: number | null;
  timelinesNotUpdated: number | null;
}

type GetLoadPrebuiltRulesAndTemplatesButton = (args: {
  isDisabled: boolean;
  onClick: () => void;
  fill?: boolean;
  'data-test-subj'?: string;
}) => React.ReactNode | null;

type GetReloadPrebuiltRulesAndTemplatesButton = ({
  isDisabled,
  onClick,
  fill,
}: {
  isDisabled: boolean;
  onClick: () => void;
  fill?: boolean;
}) => React.ReactNode | null;

interface ReturnPrePackagedRules {
  createPrePackagedRules: null | CreatePreBuiltRules;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: Func | null;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  getLoadPrebuiltRulesAndTemplatesButton: GetLoadPrebuiltRulesAndTemplatesButton;
  getReloadPrebuiltRulesAndTemplatesButton: GetReloadPrebuiltRulesAndTemplatesButton;
}

export type ReturnPrePackagedRulesAndTimelines = ReturnPrePackagedRules &
  ReturnPrePackagedTimelines;

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
}: UsePrePackagedRuleProps): ReturnPrePackagedRulesAndTimelines => {
  const [prepackagedDataStatus, setPrepackagedDataStatus] = useState<
    Pick<
      ReturnPrePackagedRulesAndTimelines,
      | 'createPrePackagedRules'
      | 'refetchPrePackagedRulesStatus'
      | 'rulesCustomInstalled'
      | 'rulesInstalled'
      | 'rulesNotInstalled'
      | 'rulesNotUpdated'
      | 'timelinesInstalled'
      | 'timelinesNotInstalled'
      | 'timelinesNotUpdated'
    >
  >({
    createPrePackagedRules: null,
    refetchPrePackagedRulesStatus: null,
    rulesCustomInstalled: null,
    rulesInstalled: null,
    rulesNotInstalled: null,
    rulesNotUpdated: null,
    timelinesInstalled: null,
    timelinesNotInstalled: null,
    timelinesNotUpdated: null,
  });

  const [loadingCreatePrePackagedRules, setLoadingCreatePrePackagedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const getSuccessToastMessage = (result: {
    rules_installed: number;
    rules_updated: number;
    timelines_installed: number;
    timelines_updated: number;
  }) => {
    const {
      rules_installed: rulesInstalled,
      rules_updated: rulesUpdated,
      timelines_installed: timelinesInstalled,
      timelines_updated: timelinesUpdated,
    } = result;
    if (rulesInstalled === 0 && (timelinesInstalled > 0 || timelinesUpdated > 0)) {
      return i18n.TIMELINE_PREPACKAGED_SUCCESS;
    } else if ((rulesInstalled > 0 || rulesUpdated > 0) && timelinesInstalled === 0) {
      return i18n.RULE_PREPACKAGED_SUCCESS;
    } else {
      return i18n.RULE_AND_TIMELINE_PREPACKAGED_SUCCESS;
    }
  };

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
          setPrepackagedDataStatus({
            createPrePackagedRules: createElasticRules,
            refetchPrePackagedRulesStatus: fetchPrePackagedRules,
            rulesCustomInstalled: prePackagedRuleStatusResponse.rules_custom_installed,
            rulesInstalled: prePackagedRuleStatusResponse.rules_installed,
            rulesNotInstalled: prePackagedRuleStatusResponse.rules_not_installed,
            rulesNotUpdated: prePackagedRuleStatusResponse.rules_not_updated,
            timelinesInstalled: prePackagedRuleStatusResponse.timelines_installed,
            timelinesNotInstalled: prePackagedRuleStatusResponse.timelines_not_installed,
            timelinesNotUpdated: prePackagedRuleStatusResponse.timelines_not_updated,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setPrepackagedDataStatus({
            createPrePackagedRules: null,
            refetchPrePackagedRulesStatus: null,
            rulesCustomInstalled: null,
            rulesInstalled: null,
            rulesNotInstalled: null,
            rulesNotUpdated: null,
            timelinesInstalled: null,
            timelinesNotInstalled: null,
            timelinesNotUpdated: null,
          });

          errorToToaster({ title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE, error, dispatchToaster });
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
            const result = await createPrepackagedRules({
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
                      prePackagedRuleStatusResponse.rules_not_updated === 0 &&
                      prePackagedRuleStatusResponse.timelines_not_installed === 0 &&
                      prePackagedRuleStatusResponse.timelines_not_updated === 0) ||
                      iterationTryOfFetchingPrePackagedCount > 100)
                  ) {
                    setLoadingCreatePrePackagedRules(false);
                    setPrepackagedDataStatus({
                      createPrePackagedRules: createElasticRules,
                      refetchPrePackagedRulesStatus: fetchPrePackagedRules,
                      rulesCustomInstalled: prePackagedRuleStatusResponse.rules_custom_installed,
                      rulesInstalled: prePackagedRuleStatusResponse.rules_installed,
                      rulesNotInstalled: prePackagedRuleStatusResponse.rules_not_installed,
                      rulesNotUpdated: prePackagedRuleStatusResponse.rules_not_updated,
                      timelinesInstalled: prePackagedRuleStatusResponse.timelines_installed,
                      timelinesNotInstalled: prePackagedRuleStatusResponse.timelines_not_installed,
                      timelinesNotUpdated: prePackagedRuleStatusResponse.timelines_not_updated,
                    });
                    displaySuccessToast(getSuccessToastMessage(result), dispatchToaster);
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
            errorToToaster({
              title: i18n.RULE_AND_TIMELINE_PREPACKAGED_FAILURE,
              error,
              dispatchToaster,
            });
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

  const prePackagedRuleStatus = useMemo(
    () =>
      getPrePackagedRuleStatus(
        prepackagedDataStatus.rulesInstalled,
        prepackagedDataStatus.rulesNotInstalled,
        prepackagedDataStatus.rulesNotUpdated
      ),
    [
      prepackagedDataStatus.rulesInstalled,
      prepackagedDataStatus.rulesNotInstalled,
      prepackagedDataStatus.rulesNotUpdated,
    ]
  );

  const prePackagedTimelineStatus = useMemo(
    () =>
      getPrePackagedTimelineStatus(
        prepackagedDataStatus.timelinesInstalled,
        prepackagedDataStatus.timelinesNotInstalled,
        prepackagedDataStatus.timelinesNotUpdated
      ),
    [
      prepackagedDataStatus.timelinesInstalled,
      prepackagedDataStatus.timelinesNotInstalled,
      prepackagedDataStatus.timelinesNotUpdated,
    ]
  );
  const getLoadPrebuiltRulesAndTemplatesButton = useCallback(
    ({ isDisabled, onClick, fill, 'data-test-subj': dataTestSubj = 'loadPrebuiltRulesBtn' }) => {
      return (prePackagedRuleStatus === 'ruleNotInstalled' ||
        prePackagedTimelineStatus === 'timelinesNotInstalled') &&
        prePackagedRuleStatus !== 'someRuleUninstall' ? (
        <EuiButton
          fill={fill}
          iconType="indexOpen"
          isLoading={loadingCreatePrePackagedRules}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj={dataTestSubj}
        >
          {prePackagedRuleStatus === 'ruleNotInstalled' &&
            prePackagedTimelineStatus === 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_RULES_AND_TEMPLATES}

          {prePackagedRuleStatus === 'ruleNotInstalled' &&
            prePackagedTimelineStatus !== 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_RULES}

          {prePackagedRuleStatus !== 'ruleNotInstalled' &&
            prePackagedTimelineStatus === 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_TIMELINE_TEMPLATES}
        </EuiButton>
      ) : null;
    },
    [loadingCreatePrePackagedRules, prePackagedRuleStatus, prePackagedTimelineStatus]
  );

  const getMissingRulesOrTimelinesButtonTitle = useCallback(
    (missingRules: number, missingTimelines: number) => {
      if (missingRules > 0 && missingTimelines === 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES(missingRules);
      else if (missingRules === 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_TIMELINES(missingTimelines);
      else if (missingRules > 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES_AND_TIMELINES(missingRules, missingTimelines);
    },
    []
  );

  const getReloadPrebuiltRulesAndTemplatesButton = useCallback(
    ({ isDisabled, onClick, fill = false }) => {
      return prePackagedRuleStatus === 'someRuleUninstall' ||
        prePackagedTimelineStatus === 'someTimelineUninstall' ? (
        <EuiButton
          fill={fill}
          iconType="plusInCircle"
          isLoading={loadingCreatePrePackagedRules}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj="reloadPrebuiltRulesBtn"
        >
          {getMissingRulesOrTimelinesButtonTitle(
            prepackagedDataStatus.rulesNotInstalled ?? 0,
            prepackagedDataStatus.timelinesNotInstalled ?? 0
          )}
        </EuiButton>
      ) : null;
    },
    [
      getMissingRulesOrTimelinesButtonTitle,
      loadingCreatePrePackagedRules,
      prePackagedRuleStatus,
      prePackagedTimelineStatus,
      prepackagedDataStatus.rulesNotInstalled,
      prepackagedDataStatus.timelinesNotInstalled,
    ]
  );

  return {
    loading,
    loadingCreatePrePackagedRules,
    ...prepackagedDataStatus,
    getLoadPrebuiltRulesAndTemplatesButton,
    getReloadPrebuiltRulesAndTemplatesButton,
  };
};
