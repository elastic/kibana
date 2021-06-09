/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import React, { Dispatch } from 'react';
import * as i18n from '../translations';
import { RulesTableAction } from '../../../../containers/detection_engine/rules/rules_table';
import {
  rulesBulkActionByQuery,
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
} from './actions';
import { ActionToaster, displayWarningToast } from '../../../../../common/components/toasters';
import { Rule } from '../../../../containers/detection_engine/rules';
import * as detectionI18n from '../../translations';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/common/schemas';

interface GetBatchItems {
  closePopover: () => void;
  dispatch: Dispatch<RulesTableAction>;
  dispatchToaster: Dispatch<ActionToaster>;
  hasMlPermissions: boolean;
  hasActionsPrivileges: boolean;
  loadingRuleIds: string[];
  reFetchRules: () => Promise<void>;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  rules: Rule[];
  selectedRuleIds: string[];
  isAllSelected: boolean;
  filterQuery: string;
  confirmDeletion: () => Promise<boolean>;
  selectedItemsCount: number;
}

export const getBatchItems = ({
  closePopover,
  dispatch,
  dispatchToaster,
  hasMlPermissions,
  loadingRuleIds,
  reFetchRules,
  refetchPrePackagedRulesStatus,
  rules,
  selectedRuleIds,
  hasActionsPrivileges,
  isAllSelected,
  filterQuery,
  confirmDeletion,
  selectedItemsCount,
}: GetBatchItems) => {
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
        dispatch,
        dispatchToaster
      );
      await reFetchRules();
    } else {
      await enableRulesAction(ruleIds, true, dispatch, dispatchToaster);
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
        dispatch,
        dispatchToaster
      );
      await reFetchRules();
    } else {
      await enableRulesAction(activatedIds, false, dispatch, dispatchToaster);
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
        dispatch,
        dispatchToaster
      );
      await reFetchRules();
    } else {
      await duplicateRulesAction(selectedRules, selectedRuleIds, dispatch, dispatchToaster);
    }
    await reFetchRules();
    await refetchPrePackagedRulesStatus();
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
        dispatch,
        dispatchToaster
      );
    } else {
      await deleteRulesAction(selectedRuleIds, dispatch, dispatchToaster);
    }
    await reFetchRules();
    await refetchPrePackagedRulesStatus();
  };

  const handleExportAction = async () => {
    closePopover();
    if (isAllSelected) {
      await rulesBulkActionByQuery(
        selectedRuleIds,
        selectedItemsCount,
        filterQuery,
        BulkAction.export,
        dispatch,
        dispatchToaster
      );
    } else {
      await exportRulesAction(
        selectedRules.map((r) => r.rule_id),
        dispatch,
        dispatchToaster
      );
    }
  };

  return [
    <EuiContextMenuItem
      key={i18n.BATCH_ACTION_ACTIVATE_SELECTED}
      data-test-subj="activateRuleBulk"
      icon="checkInCircleFilled"
      disabled={missingActionPrivileges || containsLoading || (!containsDisabled && !isAllSelected)}
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
      disabled={missingActionPrivileges || containsLoading || (!containsEnabled && !isAllSelected)}
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
};
