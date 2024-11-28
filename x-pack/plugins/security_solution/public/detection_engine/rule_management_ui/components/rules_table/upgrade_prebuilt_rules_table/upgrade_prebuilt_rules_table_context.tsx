/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  RuleFieldsToUpgrade,
  RuleUpgradeInfoForReview,
  RuleUpgradeSpecifier,
} from '../../../../../../common/api/detection_engine';
import type {
  RuleResponse,
  RuleSignatureId,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { PerFieldRuleDiffTab } from '../../../../rule_management/components/rule_details/per_field_rule_diff_tab';
import { TabContentPadding } from '../../../../rule_management/components/rule_details/rule_details_flyout';
import { RuleDiffTab } from '../../../../rule_management/components/rule_details/rule_diff_tab';
import { RuleUpgradeConflictsResolverTab } from '../../../../rule_management/components/rule_details/three_way_diff/rule_upgrade_conflicts_resolver_tab';
import * as ruleDetailsI18n from '../../../../rule_management/components/rule_details/translations';
import { useIsPrebuiltRulesCustomizationEnabled } from '../../../../rule_management/hooks/use_is_prebuilt_rules_customization_enabled';
import { usePerformUpgradeSpecificRules } from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import type {
  RuleUpgradeState,
  RulesUpgradeState,
} from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { FieldUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade/field_upgrade_state';
import { isNonUpgradeableFieldName } from '../../../../rule_management/model/prebuilt_rule_upgrade/fields';
import { useRulePreviewFlyout } from '../use_rule_preview_flyout';
import { MlJobUpgradeModal } from './modals/ml_job_upgrade_modal';
import { UpgradeConflictsModal } from './modals/upgrade_conflicts_modal';
import * as i18n from './translations';
import type { UpgradePrebuiltRulesTableFilterOptions } from './use_filter_prebuilt_rules_to_upgrade';
import { useFilterPrebuiltRulesToUpgrade } from './use_filter_prebuilt_rules_to_upgrade';
import { usePrebuiltRulesUpgradeState } from './use_prebuilt_rules_upgrade_state';
import { useMlJobUpgradeModal, useUpgradeConflictsModal } from './use_upgrade_modals';
import { RuleTypeChangeCallout } from './rule_type_change_callout';

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

  const { mutateAsync: upgradeSpecificRulesRequest } = usePerformUpgradeSpecificRules();

  const upgradeRulesToResolved = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const conflictRuleIdsSet = new Set(
        ruleIds.filter(
          (ruleId) =>
            rulesUpgradeState[ruleId].diff.num_fields_with_conflicts > 0 &&
            rulesUpgradeState[ruleId].hasUnresolvedConflicts
        )
      );
      const upgradingRuleIds = ruleIds.filter((ruleId) => !conflictRuleIdsSet.has(ruleId));
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = upgradingRuleIds.map((ruleId) => ({
        rule_id: ruleId,
        version: rulesUpgradeState[ruleId].target_rule.version,
        revision: rulesUpgradeState[ruleId].revision,
        fields: constructRuleFieldsToUpgrade(rulesUpgradeState[ruleId]),
      }));

      setLoadingRules((prev) => [...prev, ...upgradingRuleIds]);

      try {
        // Handle MLJobs modal
        if (!(await confirmLegacyMLJobs())) {
          return;
        }

        if (conflictRuleIdsSet.size > 0 && !(await confirmConflictsUpgrade())) {
          return;
        }

        await upgradeSpecificRulesRequest({
          pickVersion: 'MERGED',
          rules: ruleUpgradeSpecifiers,
        });
      } catch (err) {
        addError(err, { title: i18n.UPDATE_ERROR });
      } finally {
        const upgradedRuleIdsSet = new Set(upgradingRuleIds);

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [
      confirmLegacyMLJobs,
      confirmConflictsUpgrade,
      rulesUpgradeState,
      upgradeSpecificRulesRequest,
      addError,
    ]
  );

  const upgradeRulesToTarget = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      const ruleUpgradeSpecifiers: RuleUpgradeSpecifier[] = ruleIds.map((ruleId) => ({
        rule_id: ruleId,
        version: rulesUpgradeState[ruleId].target_rule.version,
        revision: rulesUpgradeState[ruleId].revision,
      }));

      setLoadingRules((prev) => [...prev, ...ruleIds]);

      try {
        // Handle MLJobs modal
        if (!(await confirmLegacyMLJobs())) {
          return;
        }

        await upgradeSpecificRulesRequest({
          pickVersion: 'TARGET',
          rules: ruleUpgradeSpecifiers,
        });
      } catch (err) {
        addError(err, { title: i18n.UPDATE_ERROR });
      } finally {
        const upgradedRuleIdsSet = new Set(ruleIds);

        setLoadingRules((prev) => prev.filter((id) => !upgradedRuleIdsSet.has(id)));
      }
    },
    [confirmLegacyMLJobs, rulesUpgradeState, upgradeSpecificRulesRequest, addError]
  );

  const upgradeRules = useCallback(
    async (ruleIds: RuleSignatureId[]) => {
      if (isPrebuiltRulesCustomizationEnabled) {
        await upgradeRulesToResolved(ruleIds);
      } else {
        await upgradeRulesToTarget(ruleIds);
      }
    },
    [isPrebuiltRulesCustomizationEnabled, upgradeRulesToResolved, upgradeRulesToTarget]
  );

  const ruleActionsFactory = useCallback(
    (rule: RuleResponse, closeRulePreview: () => void) => {
      const ruleUpgradeState = rulesUpgradeState[rule.rule_id];
      if (!ruleUpgradeState) {
        return null;
      }

      const hasRuleTypeChange = ruleUpgradeState.diff.fields.type?.has_update ?? false;
      return (
        <EuiButton
          disabled={
            loadingRules.includes(rule.rule_id) ||
            isRefetching ||
            isUpgradingSecurityPackages ||
            (ruleUpgradeState.hasUnresolvedConflicts && !hasRuleTypeChange)
          }
          onClick={() => {
            if (hasRuleTypeChange) {
              // If there is a rule type change, we can't resolve conflicts, only accept the target rule
              upgradeRulesToTarget([rule.rule_id]);
            } else {
              upgradeRulesToResolved([rule.rule_id]);
            }
            closeRulePreview();
          }}
          fill
          data-test-subj="updatePrebuiltRuleFromFlyoutButton"
        >
          {i18n.UPDATE_BUTTON_LABEL}
        </EuiButton>
      );
    },
    [
      rulesUpgradeState,
      loadingRules,
      isRefetching,
      isUpgradingSecurityPackages,
      upgradeRulesToTarget,
      upgradeRulesToResolved,
    ]
  );
  const extraTabsFactory = useCallback(
    (rule: RuleResponse) => {
      const ruleUpgradeState = rulesUpgradeState[rule.rule_id];

      if (!ruleUpgradeState) {
        return [];
      }

      const hasRuleTypeChange = ruleUpgradeState.diff.fields.type?.has_update ?? false;
      const shouldShowRuleTypeChangeCallout =
        hasRuleTypeChange && isPrebuiltRulesCustomizationEnabled;
      let updateTabContent = (
        <PerFieldRuleDiffTab
          header={shouldShowRuleTypeChangeCallout ? <RuleTypeChangeCallout /> : null}
          ruleDiff={ruleUpgradeState.diff}
        />
      );

      // Show the resolver tab only if rule customization is enabled and there
      // is no rule type change. In case of rule type change users can't resolve
      // conflicts, only accept the target rule.
      if (isPrebuiltRulesCustomizationEnabled && !hasRuleTypeChange) {
        updateTabContent = (
          <RuleUpgradeConflictsResolverTab
            ruleUpgradeState={ruleUpgradeState}
            setRuleFieldResolvedValue={setRuleFieldResolvedValue}
          />
        );
      }

      const updatesTab = {
        id: 'updates',
        name: (
          <EuiToolTip position="top" content={i18n.UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION}>
            <>{ruleDetailsI18n.UPDATES_TAB_LABEL}</>
          </EuiToolTip>
        ),
        content: <TabContentPadding>{updateTabContent}</TabContentPadding>,
      };

      const jsonViewTab = {
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

      return [updatesTab, jsonViewTab];
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

function constructRuleFieldsToUpgrade(ruleUpgradeState: RuleUpgradeState): RuleFieldsToUpgrade {
  const finalRule = ruleUpgradeState.finalRule as Record<string, unknown>;
  const ruleFieldsToUpgrade: Record<string, unknown> = {};

  for (const fieldName of Object.keys(ruleUpgradeState.fieldsUpgradeState)) {
    const fieldUpgradeState = ruleUpgradeState.fieldsUpgradeState[fieldName];

    if (!isNonUpgradeableFieldName(fieldName) && fieldUpgradeState === FieldUpgradeState.Accepted) {
      invariant(
        fieldName in finalRule,
        `Ready to upgrade field "${fieldName}" is not found in final rule`
      );

      ruleFieldsToUpgrade[fieldName] = {
        pick_version: 'RESOLVED',
        resolved_value: finalRule[fieldName],
      };
    }
  }

  return ruleFieldsToUpgrade;
}
