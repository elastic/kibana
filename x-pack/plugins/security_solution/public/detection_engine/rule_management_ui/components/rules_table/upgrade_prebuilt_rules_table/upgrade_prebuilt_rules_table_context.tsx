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
import { affectedJobIds } from '../../../../../detections/components/callouts/ml_job_compatibility_callout/affected_job_ids';
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
import type { RulesUpgradeState } from './use_prebuilt_rules_upgrade_state';
import { usePrebuiltRulesUpgradeState } from './use_prebuilt_rules_upgrade_state';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rule upgrade state after applying `filterOptions`
   */
  rulesUpgradeState: RulesUpgradeState;
  /**
   * Currently selected table filter
   */
  filterOptions: UpgradePrebuiltRulesTableFilterOptions;
  /**
   * All unique tags for all rules
   */
  tags: string[];
  /**
   * Indicates whether there are rules (without filters applied) to upgrade.
   */
  hasRulesToUpgrade: boolean;
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
}

export const PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR = 'updatePrebuiltRulePreview';

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: () => void;
  upgradeRules: (ruleIds: RuleSignatureId[]) => void;
  upgradeAllRules: () => void;
  setFilterOptions: Dispatch<SetStateAction<UpgradePrebuiltRulesTableFilterOptions>>;
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
  const [filterOptions, setFilterOptions] = useState<UpgradePrebuiltRulesTableFilterOptions>({
    filter: '',
    tags: [],
  });

  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const {
    data: { rules: ruleUpgradeInfos, stats: { tags } } = {
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
  const filteredRuleUpgradeInfos = useFilterPrebuiltRulesToUpgrade({
    filterOptions,
    rules: ruleUpgradeInfos,
  });
  const { rulesUpgradeState, setFieldResolvedValue } =
    usePrebuiltRulesUpgradeState(filteredRuleUpgradeInfos);

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

  const { mutateAsync: upgradeAllRulesRequest } = usePerformUpgradeAllRules();
  const { mutateAsync: upgradeSpecificRulesRequest } = usePerformUpgradeSpecificRules();

  const upgradeRules = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const rulesToUpgrade = ruleIds.map((ruleId) => ({
        rule_id: ruleId,
        version:
          rulesUpgradeState[ruleId].diff.fields.version?.target_version ??
          rulesUpgradeState[ruleId].current_rule.version,
        revision: rulesUpgradeState[ruleId].revision,
      }));
      setLoadingRules((prev) => [...prev, ...rulesToUpgrade.map((r) => r.rule_id)]);
      try {
        if (shouldConfirmUpgrade && !(await confirmUpgrade())) {
          return;
        }
        await upgradeSpecificRulesRequest(rulesToUpgrade);
      } finally {
        setLoadingRules((prev) =>
          prev.filter((id) => !rulesToUpgrade.some((r) => r.rule_id === id))
        );
      }
    },
    [confirmUpgrade, shouldConfirmUpgrade, rulesUpgradeState, upgradeSpecificRulesRequest]
  );

  const upgradeAllRules = useCallback(async () => {
    // Unselect all rules so that the table doesn't show the "bulk actions" bar
    setLoadingRules((prev) => [...prev, ...ruleUpgradeInfos.map((r) => r.rule_id)]);
    try {
      if (shouldConfirmUpgrade && !(await confirmUpgrade())) {
        return;
      }
      await upgradeAllRulesRequest();
    } finally {
      setLoadingRules([]);
    }
  }, [confirmUpgrade, ruleUpgradeInfos, shouldConfirmUpgrade, upgradeAllRulesRequest]);

  const ruleActionsFactory = useCallback(
    (rule: RuleResponse, closeRulePreview: () => void) => (
      <EuiButton
        disabled={
          loadingRules.includes(rule.rule_id) ||
          isRefetching ||
          isUpgradingSecurityPackages ||
          rulesUpgradeState[rule.rule_id]?.hasUnresolvedConflicts
        }
        onClick={() => {
          upgradeRules([rule.rule_id]);
          closeRulePreview();
        }}
        fill
        data-test-subj="updatePrebuiltRuleFromFlyoutButton"
      >
        {i18n.UPDATE_BUTTON_LABEL}
      </EuiButton>
    ),
    [rulesUpgradeState, loadingRules, isRefetching, isUpgradingSecurityPackages, upgradeRules]
  );
  const extraTabsFactory = useCallback(
    (rule: RuleResponse) => {
      const ruleUpgradeState = rulesUpgradeState[rule.rule_id];

      if (!ruleUpgradeState) {
        return [];
      }

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
              <PerFieldRuleDiffTab ruleDiff={ruleUpgradeState.diff} />
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
                oldRule={ruleUpgradeState.current_rule}
                newRule={ruleUpgradeState.target_rule}
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
                finalDiffableRule={ruleUpgradeState.finalRule}
                setFieldResolvedValue={setFieldResolvedValue}
              />
            </TabContentPadding>
          ),
        });
      }

      return extraTabs;
    },
    [rulesUpgradeState, setFieldResolvedValue, isPrebuiltRulesCustomizationEnabled]
  );
  const filteredRules = useMemo(
    () => filteredRuleUpgradeInfos.map((rule) => rule.target_rule),
    [filteredRuleUpgradeInfos]
  );
  const { rulePreviewFlyout, openRulePreview } = useRulePreviewFlyout({
    rules: filteredRules,
    ruleActionsFactory,
    extraTabsFactory,
    flyoutProps: {
      id: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
      dataTestSubj: PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR,
    },
  });

  const actions = useMemo<UpgradePrebuiltRulesTableActions>(
    () => ({
      reFetchRules: refetch,
      upgradeRules,
      upgradeAllRules,
      setFilterOptions,
      openRulePreview,
    }),
    [refetch, upgradeRules, upgradeAllRules, openRulePreview]
  );

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(() => {
    return {
      state: {
        rulesUpgradeState,
        hasRulesToUpgrade: isFetched && ruleUpgradeInfos.length > 0,
        filterOptions,
        tags,
        isFetched,
        isLoading: isLoading || loadingJobs,
        isRefetching,
        isUpgradingSecurityPackages,
        loadingRules,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    ruleUpgradeInfos,
    rulesUpgradeState,
    filterOptions,
    tags,
    isFetched,
    isLoading,
    loadingJobs,
    isRefetching,
    isUpgradingSecurityPackages,
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
