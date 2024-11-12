/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useIsPrebuiltRulesCustomizationEnabled } from '../../../../rule_management/hooks/use_is_prebuilt_rules_customization_enabled';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/api/detection_engine';
import type { RulesUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { RuleUpgradeConflictsResolverTab } from '../../../../rule_management/components/rule_details/three_way_diff/rule_upgrade_conflicts_resolver_tab';
import { PerFieldRuleDiffTab } from '../../../../rule_management/components/rule_details/per_field_rule_diff_tab';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { usePerformUpgradeSpecificRules } from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import type { UpgradePrebuiltRulesTableFilterOptions } from './use_filter_prebuilt_rules_to_upgrade';
import { useFilterPrebuiltRulesToUpgrade } from './use_filter_prebuilt_rules_to_upgrade';
import { TabContentPadding } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import { RuleDiffTab } from '../../../../rule_management/components/rule_details/rule_diff_tab';
import { MlJobUpgradeModal } from './modals/ml_job_upgrade_modal';
import { UpgradeConflictsModal } from './modals/upgrade_conflicts_modal';
import * as ruleDetailsI18n from '../../../../rule_management/components/rule_details/translations';
import * as i18n from './translations';
import { usePrebuiltRulesUpgradeState } from './use_prebuilt_rules_upgrade_state';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';
import { useMlJobUpgradeModal, useUpgradeConflictsModal } from './use_upgrade_modals';

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rule upgrade state (all rules available for upgrade)
   */
  ruleUpgradeInfos: RuleUpgradeInfoForReview[];
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
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Feature Flag to enable prebuilt rules customization
   */
  isPrebuiltRulesCustomizationEnabled: boolean;
}

export const PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR = 'updatePrebuiltRulePreview';

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: () => void;
  upgradeRules: (ruleIds: RuleSignatureId[]) => void;
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
  const isPrebuiltRulesCustomizationEnabled = useIsPrebuiltRulesCustomizationEnabled();
  const [loadingRules, setLoadingRules] = useState<RuleSignatureId[]>([]);
  const [filterOptions, setFilterOptions] = useState<UpgradePrebuiltRulesTableFilterOptions>({
    filter: '',
    tags: [],
    ruleSource: [],
  });
  const { addError } = useAppToasts();

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
  const { rulesUpgradeState, setRuleFieldResolvedValue } =
    usePrebuiltRulesUpgradeState(filteredRuleUpgradeInfos);

  const {
    isVisible: isLegacyMLJobsModalVisible,
    legacyJobsInstalled,
    confirmLegacyMLJobs,
    handleConfirm: handleLegacyMLJobsConfirm,
    handleCancel: handleLegacyMLJobsCancel,
    loadingJobs,
  } = useMlJobUpgradeModal();

  const {
    isVisible: isConflictsModalVisible,
    confirmConflictsUpgrade,
    handleConfirm: handleConflictsConfirm,
    handleCancel: handleConflictsCancel,
  } = useUpgradeConflictsModal();

  const shouldConfirmMLJobs = legacyJobsInstalled.length > 0;
  const getRulesWithConflicts = useCallback(
    (ruleIds?: RuleSignatureId[]) => {
      const rulesToUpgrade =
        ruleIds?.map((ruleId) => {
          const rule = rulesUpgradeState[ruleId];
          invariant(rule, `Rule with ID ${ruleId} not found.`);

          return rule;
        }) ?? [];

      return rulesToUpgrade.filter((rule) => rule.diff.num_fields_with_conflicts > 0);
    },
    [rulesUpgradeState]
  );

  const { mutateAsync: upgradeSpecificRulesRequest } = usePerformUpgradeSpecificRules({
    pickVersion: isPrebuiltRulesCustomizationEnabled ? 'MERGED' : 'TARGET',
  });

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
        // Handle MLJobs modal
        if (shouldConfirmMLJobs && !(await confirmLegacyMLJobs())) {
          return;
        }

        // Handle Rule Upgrades modal
        const rulesWithConflicts = getRulesWithConflicts(ruleIds);
        if (
          isPrebuiltRulesCustomizationEnabled &&
          rulesWithConflicts.length > 0 &&
          !(await confirmConflictsUpgrade())
        ) {
          return;
        }

        // Prepare payload for upgrade with rules with no conflicts
        const ruleIdsWithConflicts = new Set(rulesWithConflicts.map((rule) => rule.rule_id));
        const rulesToUpgradeWithNoConflicts = isPrebuiltRulesCustomizationEnabled
          ? rulesToUpgrade.filter((rule) => !ruleIdsWithConflicts.has(rule.rule_id))
          : rulesToUpgrade;
        await upgradeSpecificRulesRequest(rulesToUpgradeWithNoConflicts);
      } catch (err) {
        addError(err, { title: i18n.UPDATE_ERROR });
      } finally {
        setLoadingRules((prev) =>
          prev.filter((id) => !rulesToUpgrade.some((r) => r.rule_id === id))
        );
      }
    },
    [
      confirmLegacyMLJobs,
      confirmConflictsUpgrade,
      shouldConfirmMLJobs,
      getRulesWithConflicts,
      rulesUpgradeState,
      upgradeSpecificRulesRequest,
      isPrebuiltRulesCustomizationEnabled,
      addError,
    ]
  );

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

      const jsonViewUpdates = {
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
      };

      if (isPrebuiltRulesCustomizationEnabled) {
        return [
          {
            id: 'updates',
            name: (
              <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION}>
                <>{ruleDetailsI18n.UPDATES_TAB_LABEL}</>
              </EuiToolTip>
            ),
            content: (
              <TabContentPadding>
                <RuleUpgradeConflictsResolverTab
                  ruleUpgradeState={ruleUpgradeState}
                  setRuleFieldResolvedValue={setRuleFieldResolvedValue}
                />
              </TabContentPadding>
            ),
          },
          jsonViewUpdates,
        ];
      }

      return [
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
        jsonViewUpdates,
      ];
    },
    [rulesUpgradeState, setRuleFieldResolvedValue, isPrebuiltRulesCustomizationEnabled]
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
      setFilterOptions,
      openRulePreview,
    }),
    [refetch, upgradeRules, openRulePreview]
  );

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(() => {
    return {
      state: {
        ruleUpgradeInfos,
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
        isPrebuiltRulesCustomizationEnabled,
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
    isPrebuiltRulesCustomizationEnabled,
  ]);

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      <>
        {isLegacyMLJobsModalVisible && (
          <MlJobUpgradeModal
            jobs={legacyJobsInstalled}
            onCancel={handleLegacyMLJobsCancel}
            onConfirm={handleLegacyMLJobsConfirm}
          />
        )}
        {isConflictsModalVisible && (
          <UpgradeConflictsModal
            onCancel={handleConflictsCancel}
            onConfirm={handleConflictsConfirm}
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
