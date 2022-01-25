/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/common/schemas';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { displayWarningToast, useStateToaster } from '../../../../../common/components/toasters';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import { useRulesTableContext } from '../../../../containers/detection_engine/rules/rules_table/rules_table_context';
import * as detectionI18n from '../../translations';
import * as i18n from '../translations';
import {
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
  rulesBulkActionByQuery,
} from './actions';
import { useHasActionsPrivileges } from './use_has_actions_privileges';
import { useHasMlPermissions } from './use_has_ml_permissions';

interface UseBulkActionsArgs {
  filterQuery: string;
  confirmDeletion: () => Promise<boolean>;
  selectedItemsCount: number;
}

export const useBulkActions = ({
  filterQuery,
  confirmDeletion,
  selectedItemsCount,
}: UseBulkActionsArgs) => {
  const hasMlPermissions = useHasMlPermissions();
  const rulesTableContext = useRulesTableContext();
  const [, dispatchToaster] = useStateToaster();
  const hasActionsPrivileges = useHasActionsPrivileges();

  const {
    state: { isAllSelected, rules, loadingRuleIds, selectedRuleIds },
    actions: { reFetchRules, setLoadingRules, updateRules },
  } = rulesTableContext;

  return useCallback(
    (closePopover: () => void): JSX.Element[] => {
      const selectedRules = rules.filter(({ id }) => selectedRuleIds.includes(id));

      const containsEnabled = selectedRules.some(({ enabled }) => enabled);
      const containsDisabled = selectedRules.some(({ enabled }) => !enabled);
      const containsLoading = selectedRuleIds.some((id) => loadingRuleIds.includes(id));
      const containsImmutable = selectedRules.some(({ immutable }) => immutable);

      const missingActionPrivileges =
        !hasActionsPrivileges &&
        selectedRules.some((rule) => !canEditRuleWithActions(rule, hasActionsPrivileges));

      const handleActivateAction = async () => {
        closePopover();
        const deactivatedRules = selectedRules.filter(({ enabled }) => !enabled);
        const deactivatedRulesNoML = deactivatedRules.filter(({ type }) => !isMlRule(type));

        const mlRuleCount = deactivatedRules.length - deactivatedRulesNoML.length;
        if (!hasMlPermissions && mlRuleCount > 0) {
          displayWarningToast(detectionI18n.ML_RULES_UNAVAILABLE(mlRuleCount), dispatchToaster);
        }

        const ruleIds = hasMlPermissions
          ? deactivatedRules.map(({ id }) => id)
          : deactivatedRulesNoML.map(({ id }) => id);

        if (isAllSelected) {
          await rulesBulkActionByQuery(
            ruleIds,
            selectedItemsCount,
            filterQuery,
            BulkAction.enable,
            dispatchToaster,
            setLoadingRules
          );
          await reFetchRules();
        } else {
          await enableRulesAction(ruleIds, true, dispatchToaster, setLoadingRules, updateRules);
        }
      };

      const handleDeactivateActions = async () => {
        closePopover();
        const activatedIds = selectedRules.filter(({ enabled }) => enabled).map(({ id }) => id);
        if (isAllSelected) {
          await rulesBulkActionByQuery(
            activatedIds,
            selectedItemsCount,
            filterQuery,
            BulkAction.disable,
            dispatchToaster,
            setLoadingRules
          );
          await reFetchRules();
        } else {
          await enableRulesAction(
            activatedIds,
            false,
            dispatchToaster,
            setLoadingRules,
            updateRules
          );
        }
      };

      const handleDuplicateAction = async () => {
        closePopover();
        if (isAllSelected) {
          await rulesBulkActionByQuery(
            selectedRuleIds,
            selectedItemsCount,
            filterQuery,
            BulkAction.duplicate,
            dispatchToaster,
            setLoadingRules
          );
          await reFetchRules();
        } else {
          await duplicateRulesAction(
            selectedRules,
            selectedRuleIds,
            dispatchToaster,
            setLoadingRules
          );
        }
        await reFetchRules();
      };

      const handleDeleteAction = async () => {
        closePopover();
        if (isAllSelected) {
          if ((await confirmDeletion()) === false) {
            // User has cancelled deletion
            return;
          }

          await rulesBulkActionByQuery(
            selectedRuleIds,
            selectedItemsCount,
            filterQuery,
            BulkAction.delete,
            dispatchToaster,
            setLoadingRules
          );
        } else {
          await deleteRulesAction(selectedRuleIds, dispatchToaster, setLoadingRules);
        }
        await reFetchRules();
      };

      const handleExportAction = async () => {
        closePopover();
        if (isAllSelected) {
          await rulesBulkActionByQuery(
            selectedRuleIds,
            selectedItemsCount,
            filterQuery,
            BulkAction.export,
            dispatchToaster,
            setLoadingRules
          );
        } else {
          await exportRulesAction(
            selectedRules.map((r) => r.rule_id),
            dispatchToaster,
            setLoadingRules
          );
        }
      };

      return [
        <EuiContextMenuItem
          key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
          data-test-subj="activateRuleBulk"
          icon="checkInCircleFilled"
          disabled={
            missingActionPrivileges || containsLoading || (!containsDisabled && !isAllSelected)
          }
          onClick={handleActivateAction}
        >
          <EuiToolTip
            position="right"
            content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
          >
            <>{i18n.BATCH_ACTION_ACTIVATE_SELECTED}</>
          </EuiToolTip>
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key={i18n.BATCH_ACTION_DEACTIVATE_SELECTED}
          data-test-subj="deactivateRuleBulk"
          icon="crossInACircleFilled"
          disabled={
            missingActionPrivileges || containsLoading || (!containsEnabled && !isAllSelected)
          }
          onClick={handleDeactivateActions}
        >
          <EuiToolTip
            position="right"
            content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
          >
            <>{i18n.BATCH_ACTION_DEACTIVATE_SELECTED}</>
          </EuiToolTip>
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          key={i18n.BATCH_ACTION_EXPORT_SELECTED}
          data-test-subj="exportRuleBulk"
          icon="exportAction"
          disabled={
            (containsImmutable && !isAllSelected) || containsLoading || selectedRuleIds.length === 0
          }
          onClick={handleExportAction}
        >
          {i18n.BATCH_ACTION_EXPORT_SELECTED}
        </EuiContextMenuItem>,

        <EuiContextMenuItem
          key={i18n.BATCH_ACTION_DUPLICATE_SELECTED}
          data-test-subj="duplicateRuleBulk"
          icon="copy"
          disabled={missingActionPrivileges || containsLoading || selectedRuleIds.length === 0}
          onClick={handleDuplicateAction}
        >
          <EuiToolTip
            position="right"
            content={missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined}
          >
            <>{i18n.BATCH_ACTION_DUPLICATE_SELECTED}</>
          </EuiToolTip>
        </EuiContextMenuItem>,
        <EuiContextMenuItem
          data-test-subj="deleteRuleBulk"
          key={i18n.BATCH_ACTION_DELETE_SELECTED}
          icon="trash"
          title={containsImmutable ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE : undefined}
          disabled={containsLoading || selectedRuleIds.length === 0}
          onClick={handleDeleteAction}
        >
          {i18n.BATCH_ACTION_DELETE_SELECTED}
        </EuiContextMenuItem>,
      ];
    },
    [
      rules,
      selectedRuleIds,
      hasActionsPrivileges,
      isAllSelected,
      loadingRuleIds,
      hasMlPermissions,
      dispatchToaster,
      selectedItemsCount,
      filterQuery,
      setLoadingRules,
      reFetchRules,
      updateRules,
      confirmDeletion,
    ]
  );
};
