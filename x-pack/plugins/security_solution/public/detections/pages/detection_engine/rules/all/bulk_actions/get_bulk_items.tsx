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
import type { ToastsStart } from 'src/core/public';
import * as i18n from '../../translations';

import { RulesTableAction } from '../../../../../containers/detection_engine/rules/rules_table';
import {
  initRulesBulkAction,
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
import { convertRulesFilterToKQL } from '../../../../../containers/detection_engine/rules/utils';
import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';

import {
  BulkAction,
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';

interface GetBatchItems {
  closePopover: () => void;
  dispatch: Dispatch<RulesTableAction>;
  dispatchToaster: Dispatch<ActionToaster>;
  toastsApi: ToastsStart;
  hasMlPermissions: boolean;
  hasActionsPrivileges: boolean;
  loadingRuleIds: string[];
  reFetchRules: () => Promise<void>;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  rules: Rule[];
  selectedRuleIds: string[];
  isAllSelected: boolean;
  filterOptions: FilterOptions;
  confirmDeletion: () => Promise<boolean>;
  confirmBulkEdit: () => Promise<boolean>;
  completeBulkEditForm: (bulkActionEditType: BulkActionEditType) => Promise<BulkActionEditPayload>;
  fetchCustomRulesCount: (filterOptions: FilterOptions) => Promise<{ customRulesCount: number }>;
  selectedItemsCount: number;
}

// eslint-disable-next-line complexity
export const getBatchItems = ({
  closePopover,
  dispatch,
  dispatchToaster,
  toastsApi,
  hasMlPermissions,
  loadingRuleIds,
  reFetchRules,
  refetchPrePackagedRulesStatus,
  rules,
  selectedRuleIds,
  hasActionsPrivileges,
  isAllSelected,
  filterOptions,
  confirmDeletion,
  confirmBulkEdit,
  completeBulkEditForm,
  fetchCustomRulesCount,
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

  const filterQuery = convertRulesFilterToKQL(filterOptions);

  const handleActivateAction = async () => {
    closePopover();
    const deactivatedRules = selectedRules.filter(({ enabled }) => !enabled);
    const deactivatedRulesNoML = deactivatedRules.filter(({ type }) => !isMlRule(type));

    const mlRuleCount = deactivatedRules.length - deactivatedRulesNoML.length;
    if (!hasMlPermissions && mlRuleCount > 0) {
      toastsApi.addWarning(detectionI18n.ML_RULES_UNAVAILABLE(mlRuleCount));
    }

    const ruleIds = hasMlPermissions
      ? deactivatedRules.map(({ id }) => id)
      : deactivatedRulesNoML.map(({ id }) => id);

    if (isAllSelected) {
      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: ruleIds,
        selectedItemsCount,
        action: BulkAction.enable,
        dispatch,
        toastsApi,
      });

      await rulesBulkAction.byQuery(filterQuery);

      await reFetchRules();
    } else {
      await enableRulesAction(ruleIds, true, dispatch, dispatchToaster);
    }
  };

  const handleDeactivateActions = async () => {
    closePopover();
    const activatedIds = selectedRules.filter(({ enabled }) => enabled).map(({ id }) => id);
    if (isAllSelected) {
      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: activatedIds,
        selectedItemsCount,
        action: BulkAction.disable,
        dispatch,
        toastsApi,
      });

      await rulesBulkAction.byQuery(filterQuery);
      await reFetchRules();
    } else {
      await enableRulesAction(activatedIds, false, dispatch, dispatchToaster);
    }
  };

  const handleDuplicateAction = async () => {
    closePopover();
    if (isAllSelected) {
      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: selectedRuleIds,
        selectedItemsCount,
        action: BulkAction.duplicate,
        dispatch,
        toastsApi,
      });

      await rulesBulkAction.byQuery(filterQuery);
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

      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: selectedRuleIds,
        selectedItemsCount,
        action: BulkAction.delete,
        dispatch,
        toastsApi,
      });

      await rulesBulkAction.byQuery(filterQuery);
    } else {
      await deleteRulesAction(selectedRuleIds, dispatch, dispatchToaster);
    }
    await reFetchRules();
    await refetchPrePackagedRulesStatus();
  };

  const handleExportAction = async () => {
    closePopover();
    if (isAllSelected) {
      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: selectedRuleIds,
        selectedItemsCount,
        action: BulkAction.export,
        dispatch,
        toastsApi,
      });

      await rulesBulkAction.byQuery(filterQuery);
    } else {
      await exportRulesAction(
        selectedRules.map((r) => r.rule_id),
        dispatch,
        dispatchToaster
      );
    }
  };

  const handleBulkEdit = (bulkEditActionType: BulkActionEditType) => async () => {
    closePopover();

    const customSelectedRuleIds = selectedRules
      .filter((rule) => rule.immutable === false)
      .map((rule) => rule.id);
    let customRulesCount = customSelectedRuleIds.length;

    if (isAllSelected) {
      const res = await fetchCustomRulesCount(filterOptions);
      customRulesCount = res.customRulesCount;
    }

    if ((await confirmBulkEdit()) === false) {
      // User has cancelled edit action
      return;
    }

    try {
      const editPayload = await completeBulkEditForm(bulkEditActionType);
      const rulesBulkAction = initRulesBulkAction({
        visibleRuleIds: customSelectedRuleIds,
        selectedItemsCount: customRulesCount,
        action: BulkAction.edit,
        dispatch,
        toastsApi,
        payload: { edit: [editPayload] },
        onSuccess: () => {
          toastsApi.addSuccess({
            title: 'Rules changes updated',
            text: `You’ve successfully updated ${customRulesCount} rule.`,
          });
        },
        onError: (error: Error) => {
          toastsApi.addError(error, {
            title: 'Some rules failed to update',
            toastMessage: (
              <>
                There some rules are failed to update the actions you’ve applied.{' '}
                <a>Show failed rules</a>
              </>
            ) as unknown as string,
          });
        },
      });

      // only edit custom rules, as elastic rule are immutable
      if (isAllSelected) {
        const customRulesOnlyFilterQuery = convertRulesFilterToKQL({
          ...filterOptions,
          showCustomRules: true,
        });
        await rulesBulkAction.byQuery(customRulesOnlyFilterQuery);
      } else {
        await rulesBulkAction.byIds(customSelectedRuleIds);
      }

      await reFetchRules();
    } catch (e) {
      // user has cancelled form or error has occured
    }
  };

  const isDeleteDisabled = containsLoading || selectedRuleIds.length === 0;
  const isEditDisabled = missingActionPrivileges || containsLoading || selectedRuleIds.length === 0;

  return [
    {
      id: 0,
      title: 'Options',
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
          disabled: isEditDisabled,
          onClick: handleDuplicateAction,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: 'Index patterns',
          name: 'Index patterns',
          'data-test-subj': 'indexPatternsBulkEditRule',
          disabled: isEditDisabled,
          panel: 2,
        },
        {
          key: 'Tags',
          name: 'Tags',
          'data-test-subj': 'tagsBulkEditRule',
          disabled: isEditDisabled,
          panel: 1,
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
    {
      id: 1,
      title: 'Options',
      items: [
        {
          key: 'Add tags',
          name: 'Add tags',
          'data-test-subj': 'addTagsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.add_tags),
          disabled: isEditDisabled,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: 'Delete tags',
          name: 'Delete tags',
          'data-test-subj': 'deleteTagsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.delete_tags),
          disabled: isEditDisabled,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
      ],
    },
    {
      id: 2,
      title: 'Options',
      items: [
        {
          key: i18n.BULK_ACTION_ADD_INDEX_PATTERNS,
          name: i18n.BULK_ACTION_ADD_INDEX_PATTERNS,
          'data-test-subj': 'addIndexPatternsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.add_index_patterns),
          disabled: isEditDisabled,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
        {
          key: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
          name: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
          'data-test-subj': 'deleteIndexPatternsBulkEditRule',
          onClick: handleBulkEdit(BulkActionEditType.delete_index_patterns),
          disabled: isEditDisabled,
          toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
          toolTipPosition: 'right',
        },
      ],
    },
  ];
};
