/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { ThreeWayDiffTab } from '../../../../rule_management/components/rule_details/three_way_diff_tab';
import { PerFieldRuleDiffTab } from '../../../../rule_management/components/rule_details/per_field_rule_diff_tab';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { convertRuleToDiffable } from '../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import { affectedJobIds } from '../../../../../detections/components/callouts/ml_job_compatibility_callout/affected_job_ids';
import type {
  DiffableRule,
  RuleUpgradeInfoForReview,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import {
  usePerformUpgradeAllRules,
  usePerformUpgradeSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import type { UpgradePrebuiltRulesTableFilterOptions } from './use_filter_prebuilt_rules_to_upgrade';
import { useFilterPrebuiltRulesToUpgrade } from './use_filter_prebuilt_rules_to_upgrade';
import { useAsyncConfirmation } from '../rules_table/use_async_confirmation';
import { TabContentPadding } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import { RuleDiffTab } from '../../../../rule_management/components/rule_details/rule_diff_tab';
import { MlJobUpgradeModal } from '../../../../../detections/components/modals/ml_job_upgrade_modal';
import * as ruleDetailsI18n from '../../../../rule_management/components/rule_details/translations';
import * as i18n from './translations';
import { useRulesUpgradeState } from './use_rules_upgrade_state';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';

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
   * Is true when installing security_detection_rules
   * package in background
   */
  isUpgradingSecurityPackages: boolean;
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
}

export const PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR = 'updatePrebuiltRulePreview';

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: () => void;
  upgradeOneRule: (ruleId: string) => void;
  upgradeSelectedRules: () => void;
  upgradeAllRules: () => void;
  setFilterOptions: Dispatch<SetStateAction<UpgradePrebuiltRulesTableFilterOptions>>;
  selectRules: (rules: RuleUpgradeInfoForReview[]) => void;
  openRulePreview: (ruleId: string) => void;
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
  const isPrebuiltRulesCustomizationEnabled = useIsExperimentalFeatureEnabled(
    'prebuiltRulesCustomizationEnabled'
  );
  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const [selectedRules, setSelectedRules] = useState<RuleUpgradeInfoForReview[]>([]);
  const [filterOptions, setFilterOptions] = useState<UpgradePrebuiltRulesTableFilterOptions>({
    filter: '',
    tags: [],
  });

  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

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

  const { rulesUpgradeState, setFieldResolvedValue } = useRulesUpgradeState();

  const { mutateAsync: upgradeAllRulesRequest } = usePerformUpgradeAllRules();
  const { mutateAsync: upgradeSpecificRulesRequest } = usePerformUpgradeSpecificRules();

  const filteredRuleUpgradeInfos = useFilterPrebuiltRulesToUpgrade({ filterOptions, rules });

  // Wrapper to add confirmation modal for users who may be running older ML Jobs that would
  // be overridden by updating their rules. For details, see: https://github.com/elastic/kibana/issues/128121
  const [isUpgradeModalVisible, showUpgradeModal, hideUpgradeModal] = useBoolState(false);
  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));

  const [confirmUpgrade, handleUpgradeConfirm, handleUpgradeCancel] = useAsyncConfirmation({
    onInit: showUpgradeModal,
    onFinish: hideUpgradeModal,
  });

  const shouldConfirmUpgrade = legacyJobsInstalled.length > 0;

  const upgradeOneRule = useCallback(
    async (ruleId: RuleSignatureId) => {
      const rule = rules.find((r) => r.rule_id === ruleId);
      invariant(rule, `Rule with id ${ruleId} not found`);

      setLoadingRules((prev) => [...prev, ruleId]);
      try {
        if (shouldConfirmUpgrade && !(await confirmUpgrade())) {
          return;
        }
        await upgradeSpecificRulesRequest([
          {
            rule_id: ruleId,
            version: rule.diff.fields.version?.target_version ?? rule.current_rule.version,
            revision: rule.revision,
          },
        ]);
      } finally {
        setLoadingRules((prev) => prev.filter((id) => id !== ruleId));
      }
    },
    [confirmUpgrade, rules, shouldConfirmUpgrade, upgradeSpecificRulesRequest]
  );

  const upgradeSelectedRules = useCallback(async () => {
    const rulesToUpgrade = selectedRules.map((rule) => ({
      rule_id: rule.rule_id,
      version: rule.diff.fields.version?.target_version ?? rule.current_rule.version,
      revision: rule.revision,
    }));
    setLoadingRules((prev) => [...prev, ...rulesToUpgrade.map((r) => r.rule_id)]);
    try {
      if (shouldConfirmUpgrade && !(await confirmUpgrade())) {
        return;
      }
      await upgradeSpecificRulesRequest(rulesToUpgrade);
    } finally {
      setLoadingRules((prev) => prev.filter((id) => !rulesToUpgrade.some((r) => r.rule_id === id)));
      setSelectedRules([]);
    }
  }, [confirmUpgrade, selectedRules, shouldConfirmUpgrade, upgradeSpecificRulesRequest]);

  const upgradeAllRules = useCallback(async () => {
    // Unselect all rules so that the table doesn't show the "bulk actions" bar
    setLoadingRules((prev) => [...prev, ...rules.map((r) => r.rule_id)]);
    try {
      if (shouldConfirmUpgrade && !(await confirmUpgrade())) {
        return;
      }
      await upgradeAllRulesRequest();
    } finally {
      setLoadingRules([]);
      setSelectedRules([]);
    }
  }, [confirmUpgrade, rules, shouldConfirmUpgrade, upgradeAllRulesRequest]);

  const ruleActionsFactory = useCallback(
    (rule: RuleResponse, closeRulePreview: () => void) => {
      const canPreviewedRuleBeUpgraded = Boolean(
        loadingRules.includes(rule.id) || isRefetching || isUpgradingSecurityPackages
      );

      return (
        <EuiButton
          disabled={canPreviewedRuleBeUpgraded}
          onClick={() => {
            upgradeOneRule(rule.id);
            closeRulePreview();
          }}
          fill
          data-test-subj="updatePrebuiltRuleFromFlyoutButton"
        >
          {i18n.UPDATE_BUTTON_LABEL}
        </EuiButton>
      );
    },
    [loadingRules, isRefetching, isUpgradingSecurityPackages, upgradeOneRule]
  );
  const extraTabsFactory = useCallback(
    (rule: RuleResponse) => {
      const ruleUpgradeInfo = filteredRuleUpgradeInfos.find(({ id }) => id === rule.id);

      if (!ruleUpgradeInfo) {
        return [];
      }

      const finalDiffableRule: DiffableRule = {
        ...convertRuleToDiffable(ruleUpgradeInfo.target_rule),
        ...rulesUpgradeState[rule.id],
      };

      const extraTabs = [
        {
          id: 'updates',
          name: (
            <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION}>
              <>{ruleDetailsI18n.UPDATES_TAB_LABEL}</>
            </EuiToolTip>
          ),
          content: (
            <TabContentPadding>
              <PerFieldRuleDiffTab ruleDiff={ruleUpgradeInfo.diff} />
            </TabContentPadding>
          ),
        },
        {
          id: 'jsonViewUpdates',
          name: (
            <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_JSON_VIEW_TOOLTIP_DESCRIPTION}>
              <>{ruleDetailsI18n.JSON_VIEW_UPDATES_TAB_LABEL}</>
            </EuiToolTip>
          ),
          content: (
            <TabContentPadding>
              <RuleDiffTab
                oldRule={ruleUpgradeInfo.current_rule}
                newRule={ruleUpgradeInfo.target_rule}
              />
            </TabContentPadding>
          ),
        },
      ];

      if (isPrebuiltRulesCustomizationEnabled) {
        extraTabs.unshift({
          id: 'diff',
          name: (
            <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION}>
              <>{ruleDetailsI18n.DIFF_TAB_LABEL}</>
            </EuiToolTip>
          ),
          content: (
            <TabContentPadding>
              <ThreeWayDiffTab
                finalDiffableRule={finalDiffableRule}
                setFieldResolvedValue={setFieldResolvedValue}
              />
            </TabContentPadding>
          ),
        });
      }

      return extraTabs;
    },
    [
      filteredRuleUpgradeInfos,
      rulesUpgradeState,
      setFieldResolvedValue,
      isPrebuiltRulesCustomizationEnabled,
    ]
  );
  const filteredRules = useMemo(
    () => filteredRuleUpgradeInfos.map((rule) => rule.target_rule),
    [filteredRuleUpgradeInfos]
  );
  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    rules: filteredRules,
    ruleActionsFactory,
    extraTabsFactory,
  });

  const actions = useMemo<UpgradePrebuiltRulesTableActions>(
    () => ({
      reFetchRules: refetch,
      upgradeOneRule,
      upgradeSelectedRules,
      upgradeAllRules,
      setFilterOptions,
      selectRules: setSelectedRules,
      openRulePreview,
    }),
    [refetch, upgradeOneRule, upgradeSelectedRules, upgradeAllRules, openRulePreview]
  );

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(() => {
    return {
      state: {
        rules,
        rulesUpgradeState,
        filteredRules: filteredRuleUpgradeInfos,
        filterOptions,
        tags,
        isFetched,
        isLoading: isLoading && loadingJobs,
        isRefetching,
        isUpgradingSecurityPackages,
        selectedRules,
        loadingRules,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    rules,
    rulesUpgradeState,
    filteredRuleUpgradeInfos,
    filterOptions,
    tags,
    isFetched,
    isLoading,
    loadingJobs,
    isRefetching,
    isUpgradingSecurityPackages,
    selectedRules,
    loadingRules,
    dataUpdatedAt,
    actions,
  ]);

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      <>
        {isUpgradeModalVisible && (
          <MlJobUpgradeModal
            jobs={legacyJobsInstalled}
            onCancel={handleUpgradeCancel}
            onConfirm={handleUpgradeConfirm}
          />
        )}
        {children}
        {rulePreviewFlyout}
      </>
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
