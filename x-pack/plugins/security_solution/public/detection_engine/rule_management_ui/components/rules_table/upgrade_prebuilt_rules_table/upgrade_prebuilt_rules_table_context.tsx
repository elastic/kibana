/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { affectedJobIds } from '../../../../../detections/components/callouts/ml_job_compatibility_callout/affected_job_ids';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import type { RuleSignatureId } from '../../../../../../common/detection_engine/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import {
  usePerformUpgradeAllRules,
  usePerformUpgradeSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import type { UpgradePrebuiltRulesTableFilterOptions } from './use_filter_prebuilt_rules_to_upgrade';
import { useFilterPrebuiltRulesToUpgrade } from './use_filter_prebuilt_rules_to_upgrade';

export type ModalConfirmationUpgradeMethod = 'SINGLE_RULE' | 'SPECIFIC_RULES' | 'ALL_RULES' | null;

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rules available to be updated
   */
  rules: RuleUpgradeInfoForReview[];
  /**
   * Rules to display in table after applying filters
   */
  filteredRules: RuleUpgradeInfoForReview[];
  /**
   * Currently selected table filter
   */
  filterOptions: UpgradePrebuiltRulesTableFilterOptions;
  /**
   * All unique tags for all rules
   */
  tags: string[];
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * List of rule IDs that are currently being upgraded
   */
  loadingRules: RuleSignatureId[];
  /**
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRules: RuleUpgradeInfoForReview[];
  /**
   * Legacy ML Jobs that cause modal to pop up before performing rule ugprades
   */
  legacyJobsInstalled: MlSummaryJob[];
  /**
   * Upgrade method to execute when the user confirms the modal
   */
  modalConfirmationUpdateMethod: ModalConfirmationUpgradeMethod | null;
  /**
   * Is true when the modal is visible
   * */
  isUpgradeModalVisible: boolean;
  /**
   * Rule ID of single rule to upgrade when the ML jobs modal is confirmed
   * */
  ruleIdToUpgrade: string;
}

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: () => void;
  upgradeSingleRuleFromRowCTA: (ruleId: string) => void;
  upgradeSelectedRulesCTAClick: () => void;
  upgradeAllRulesCTAClick: () => void;
  selectRules: (rules: RuleUpgradeInfoForReview[]) => void;
  setFilterOptions: Dispatch<SetStateAction<UpgradePrebuiltRulesTableFilterOptions>>;
  mlJobUpgradeModalConfirm: () => void;
  mlJobUpgradeModalCancel: () => void;
}

export interface UpgradePrebuiltRulesContextType {
  state: UpgradePrebuiltRulesTableState;
  actions: UpgradePrebuiltRulesTableActions;
}

const UpgradePrebuiltRulesTableContext = createContext<UpgradePrebuiltRulesContextType | null>(
  null
);

interface UpgradePrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

export const UpgradePrebuiltRulesTableContextProvider = ({
  children,
}: UpgradePrebuiltRulesTableContextProviderProps) => {
  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const [selectedRules, setSelectedRules] = useState<RuleUpgradeInfoForReview[]>([]);
  const [modalConfirmationUpdateMethod, setModalConfirmationUpgradeMethod] =
    useState<ModalConfirmationUpgradeMethod>(null);
  const [ruleIdToUpgrade, setRuleIdToUpgrade] = useState<string>('');

  const [filterOptions, setFilterOptions] = useState<UpgradePrebuiltRulesTableFilterOptions>({
    filter: '',
    tags: [],
  });

  const {
    data: { rules, stats: { tags } } = {
      rules: [],
      stats: { tags: [] },
    },
    refetch,
    dataUpdatedAt,
    isFetched,
    isLoading,
    isRefetching,
  } = usePrebuiltRulesUpgradeReview({
    refetchInterval: false, // Disable automatic refetching since request is expensive
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const { mutateAsync: upgradeAllRulesRequest } = usePerformUpgradeAllRules();
  const { mutateAsync: upgradeSpecificRulesRequest } = usePerformUpgradeSpecificRules();

  // Wrapper to add confirmation modal for users who may be running older ML Jobs that would
  // be overridden by updating their rules. For details, see: https://github.com/elastic/kibana/issues/128121
  const [isUpgradeModalVisible, showUpgradeModal, hideUpgradeModal] = useBoolState(false);
  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));

  const upgradeOneRule = useCallback(
    async (ruleId: RuleSignatureId) => {
      const rule = rules.find((r) => r.rule_id === ruleId);
      invariant(rule, `Rule with id ${ruleId} not found`);

      setLoadingRules((prev) => [...prev, ruleId]);
      try {
        await upgradeSpecificRulesRequest([
          {
            rule_id: ruleId,
            version: rule.diff.fields.version?.target_version ?? rule.rule.version,
            revision: rule.revision,
          },
        ]);
      } finally {
        setLoadingRules((prev) => prev.filter((id) => id !== ruleId));
      }
    },
    [rules, upgradeSpecificRulesRequest]
  );

  const upgradeSelectedRules = useCallback(async () => {
    const rulesToUpgrade = selectedRules.map((rule) => ({
      rule_id: rule.rule_id,
      version: rule.diff.fields.version?.target_version ?? rule.rule.version,
      revision: rule.revision,
    }));
    setLoadingRules((prev) => [...prev, ...rulesToUpgrade.map((r) => r.rule_id)]);
    try {
      await upgradeSpecificRulesRequest(rulesToUpgrade);
    } finally {
      setLoadingRules((prev) => prev.filter((id) => !rulesToUpgrade.some((r) => r.rule_id === id)));
      setSelectedRules([]);
    }
  }, [selectedRules, upgradeSpecificRulesRequest]);

  const upgradeAllRules = useCallback(async () => {
    // Unselect all rules so that the table doesn't show the "bulk actions" bar
    setLoadingRules((prev) => [...prev, ...rules.map((r) => r.rule_id)]);
    try {
      await upgradeAllRulesRequest();
    } finally {
      setLoadingRules([]);
      setSelectedRules([]);
    }
  }, [rules, upgradeAllRulesRequest]);

  // Wrapper around upgrade rules methods to display ML Jobs warning modal when necessary
  const upgradeRulesWrapper = useCallback(
    (upgradeMethod: ModalConfirmationUpgradeMethod, upgradeRuleMethod: () => Promise<void>) =>
      () => {
        if (legacyJobsInstalled.length > 0) {
          showUpgradeModal();
          setModalConfirmationUpgradeMethod(upgradeMethod);
        } else {
          upgradeRuleMethod();
        }
      },
    [legacyJobsInstalled.length, showUpgradeModal]
  );

  const upgradeSelectedRulesCTAClick = upgradeRulesWrapper('SPECIFIC_RULES', upgradeSelectedRules);
  const upgradeAllRulesCTAClick = upgradeRulesWrapper('ALL_RULES', upgradeAllRules);

  // Wrapper around upgradeOneRule to display ML Jobs warning modal when necessary
  // when attempting to upgrade a single rule from each rule row CTA
  const upgradeSingleRuleFromRowCTA = useCallback(
    (ruleId: string) => {
      if (legacyJobsInstalled.length > 0) {
        showUpgradeModal();
        setModalConfirmationUpgradeMethod('SINGLE_RULE');
        setRuleIdToUpgrade(ruleId);
      } else {
        upgradeOneRule(ruleId);
      }
    },
    [
      legacyJobsInstalled,
      setModalConfirmationUpgradeMethod,
      setRuleIdToUpgrade,
      showUpgradeModal,
      upgradeOneRule,
    ]
  );

  const mlJobUpgradeModalConfirm = useCallback(() => {
    if (modalConfirmationUpdateMethod === 'ALL_RULES') {
      upgradeAllRules();
    } else if (modalConfirmationUpdateMethod === 'SPECIFIC_RULES') {
      upgradeSelectedRules();
    } else if (modalConfirmationUpdateMethod === 'SINGLE_RULE') {
      upgradeOneRule(ruleIdToUpgrade);
    }
    hideUpgradeModal();
  }, [
    hideUpgradeModal,
    modalConfirmationUpdateMethod,
    ruleIdToUpgrade,
    upgradeAllRules,
    upgradeOneRule,
    upgradeSelectedRules,
  ]);

  const mlJobUpgradeModalCancel = useCallback(() => {
    setModalConfirmationUpgradeMethod(null);
    hideUpgradeModal();
  }, [hideUpgradeModal, setModalConfirmationUpgradeMethod]);

  const actions = useMemo<UpgradePrebuiltRulesTableActions>(
    () => ({
      reFetchRules: refetch,
      upgradeSingleRuleFromRowCTA,
      upgradeSelectedRulesCTAClick,
      upgradeAllRulesCTAClick,
      setFilterOptions,
      selectRules: setSelectedRules,
      mlJobUpgradeModalConfirm,
      mlJobUpgradeModalCancel,
    }),
    [
      refetch,
      upgradeSingleRuleFromRowCTA,
      upgradeSelectedRulesCTAClick,
      upgradeAllRulesCTAClick,
      mlJobUpgradeModalConfirm,
      mlJobUpgradeModalCancel,
    ]
  );

  const filteredRules = useFilterPrebuiltRulesToUpgrade({ filterOptions, rules });

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(() => {
    return {
      state: {
        rules,
        filteredRules,
        filterOptions,
        tags,
        isFetched,
        isLoading: isLoading && loadingJobs,
        isRefetching,
        selectedRules,
        loadingRules,
        lastUpdated: dataUpdatedAt,
        legacyJobsInstalled,
        isUpgradeModalVisible,
        ruleIdToUpgrade,
        modalConfirmationUpdateMethod,
      },
      actions,
    };
  }, [
    rules,
    filteredRules,
    filterOptions,
    tags,
    isFetched,
    isLoading,
    loadingJobs,
    isRefetching,
    selectedRules,
    loadingRules,
    dataUpdatedAt,
    legacyJobsInstalled,
    isUpgradeModalVisible,
    ruleIdToUpgrade,
    modalConfirmationUpdateMethod,
    actions,
  ]);

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      {children}
    </UpgradePrebuiltRulesTableContext.Provider>
  );
};

export const useUpgradePrebuiltRulesTableContext = (): UpgradePrebuiltRulesContextType => {
  const rulesTableContext = useContext(UpgradePrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useUpgradePrebuiltRulesTableContext should be used inside UpgradePrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};
