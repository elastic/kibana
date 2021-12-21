/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-shared-deps-src/theme';
import React, { Dispatch } from 'react';
import * as i18n from '../../translations';
import { RulesTableAction } from '../../../../../containers/detection_engine/rules/rules_table';
import {
  rulesBulkActionByQuery,
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
} from '.././actions';
import { ActionToaster, displayWarningToast } from '../../../../../../common/components/toasters';
import { Rule } from '../../../../../containers/detection_engine/rules';
import * as detectionI18n from '../../../translations';
import { isMlRule } from '../../../../../../../common/machine_learning/helpers';
import { canEditRuleWithActions } from '../../../../../../common/utils/privileges';
import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

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
  confirmBulkEdit: () => Promise<boolean>;
  performBulkEdit: () => Promise<boolean>;
  fetchRulesCount: (filter: string) => Promise<void>
  selectedItemsCount: number;
}

// eslint-disable-next-line complexity
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
  confirmBulkEdit,
  performBulkEdit,
  fetchRulesCount,
  selectedItemsCount,
}: GetBatchItems): EuiContextMenuPanelDescriptor[] => {
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

  const handleBulkEdit = (bulkEditAction: BulkActionEditType) => async () => {
    closePopover();

    if (isAllSelected) {
      await fetchRulesCount(filterQuery);
    }

    if ((await confirmBulkEdit()) === false) {
      return;
    }

    if ((await performBulkEdit()) === false) {
      return;
    }

   // alert('should do EDIT action');
    // await rulesBulkActionByQuery(
    //   selectedRuleIds,
    //   selectedItemsCount,
    //   filterQuery,
    //   BulkAction.edit,
    //   dispatch,
    //   dispatchToaster
    // );

    // await reFetchRules();
  };

  const isDeleteDisabled = containsLoading || selectedRuleIds.length === 0;
  return [
    {
      id: 0,
      items: [
        {
          key: i18n.BULK_ACTION_ENABLE,
          name: i18n.BULK_ACTION_ENABLE,
          'data-test-subj': 'activateRuleBulk',
          disabled:
            missingActionPrivileges || containsLoading || (!containsDisabled && !isAllSelected),
          onClick: handleActivateAction,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: i18n.BULK_ACTION_DUPLICATE,
          name: i18n.BULK_ACTION_DUPLICATE,
          'data-test-subj': 'duplicateRuleBulk',
          disabled: missingActionPrivileges || containsLoading || selectedRuleIds.length === 0,
          onClick: handleDuplicateAction,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          isSeparator: true,
          key: 'bulkEditRuleSeparatorStart',
        },
        {
          key: i18n.BULK_ACTION_ADD_INDEX_PATTERNS,
          name: i18n.BULK_ACTION_ADD_INDEX_PATTERNS,
          'data-test-subj': 'addIndexPatternsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.add_index_patterns),
          disabled: missingActionPrivileges || containsLoading || selectedRuleIds.length === 0,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
          name: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
          'data-test-subj': 'deleteIndexPatternsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.delete_index_patterns),
          disabled: missingActionPrivileges || containsLoading || selectedRuleIds.length === 0,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          isSeparator: true,
          key: 'bulkEditRuleSeparatorEnd',
        },
        {
          key: i18n.BULK_ACTION_EXPORT,
          name: i18n.BULK_ACTION_EXPORT,
          'data-test-subj': 'exportRuleBulk',
          disabled:
            (containsImmutable && !isAllSelected) ||
            containsLoading ||
            selectedRuleIds.length === 0,
          onClick: handleExportAction,
        },
        {
          key: i18n.BULK_ACTION_DISABLE,
          name: i18n.BULK_ACTION_DISABLE,
          'data-test-subj': 'deactivateRuleBulk',
          disabled:
            missingActionPrivileges || containsLoading || (!containsEnabled && !isAllSelected),
          onClick: handleDeactivateActions,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: i18n.BULK_ACTION_DELETE,
          name: (
            <EuiTextColor
              color={isDeleteDisabled ? euiThemeVars.euiButtonColorDisabledText : 'danger'}
            >
              {i18n.BATCH_ACTION_DELETE_SELECTED}
            </EuiTextColor>
          ),
          'data-test-subj': 'deleteRuleBulk',
          disabled: isDeleteDisabled,
          onClick: handleDeleteAction,
          toolTipContent: containsImmutable
            ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE
            : undefined,
          toolTipPosition: 'right',
        },
      ],
    },
  ];
};
