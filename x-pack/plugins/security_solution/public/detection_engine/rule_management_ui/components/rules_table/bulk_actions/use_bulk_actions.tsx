/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import type { Toast } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useCallback } from 'react';
import type { BulkActionEditPayload } from '../../../../../../common/detection_engine/rule_management';
import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../common/detection_engine/rule_management';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { BULK_RULE_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import * as detectionI18n from '../../../../../detections/pages/detection_engine/translations';
import {
  downloadExportedRules,
  useBulkExport,
} from '../../../../rule_management/logic/bulk_actions/use_bulk_export';
import { useExecuteBulkAction } from '../../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import type { FilterOptions } from '../../../../rule_management/logic/types';
import { convertRulesFilterToKQL } from '../../../../rule_management/logic/utils';
import { getExportedRulesDetails } from '../helpers';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import { useHasActionsPrivileges } from '../use_has_actions_privileges';
import { useHasMlPermissions } from '../use_has_ml_permissions';
import type { BulkActionForConfirmation, DryRunResult } from './types';
import type { ExecuteBulkActionsDryRun } from './use_bulk_actions_dry_run';
import { transformExportDetailsToDryRunResult } from './utils/dry_run_result';
import { prepareSearchParams } from './utils/prepare_search_params';

interface UseBulkActionsArgs {
  filterOptions: FilterOptions;
  confirmDeletion: () => Promise<boolean>;
  showBulkActionConfirmation: (
    result: DryRunResult | undefined,
    action: BulkActionForConfirmation
  ) => Promise<boolean>;
  completeBulkEditForm: (
    bulkActionEditType: BulkActionEditType
  ) => Promise<BulkActionEditPayload | null>;
  executeBulkActionsDryRun: ExecuteBulkActionsDryRun;
}

export const useBulkActions = ({
  filterOptions,
  confirmDeletion,
  showBulkActionConfirmation,
  completeBulkEditForm,
  executeBulkActionsDryRun,
}: UseBulkActionsArgs) => {
  const hasMlPermissions = useHasMlPermissions();
  const rulesTableContext = useRulesTableContext();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const toasts = useAppToasts();
  const filterQuery = convertRulesFilterToKQL(filterOptions);
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction();
  const { bulkExport } = useBulkExport();

  const {
    state: { isAllSelected, rules, loadingRuleIds, selectedRuleIds },
    actions: { setLoadingRules, clearRulesSelection },
  } = rulesTableContext;

  const getBulkItemsPopoverContent = useCallback(
    (closePopover: () => void): EuiContextMenuPanelDescriptor[] => {
      const selectedRules = rules.filter(({ id }) => selectedRuleIds.includes(id));

      const containsEnabled = selectedRules.some(({ enabled }) => enabled);
      const containsDisabled = selectedRules.some(({ enabled }) => !enabled);
      const containsLoading = selectedRuleIds.some((id) => loadingRuleIds.includes(id));
      const containsImmutable = selectedRules.some(({ immutable }) => immutable);

      const missingActionPrivileges =
        !hasActionsPrivileges &&
        selectedRules.some((rule) => !canEditRuleWithActions(rule, hasActionsPrivileges));

      const handleEnableAction = async () => {
        startTransaction({ name: BULK_RULE_ACTIONS.ENABLE });
        closePopover();

        const disabledRules = selectedRules.filter(({ enabled }) => !enabled);
        const disabledRulesNoML = disabledRules.filter(({ type }) => !isMlRule(type));

        const mlRuleCount = disabledRules.length - disabledRulesNoML.length;
        if (!hasMlPermissions && mlRuleCount > 0) {
          toasts.addWarning(detectionI18n.ML_RULES_UNAVAILABLE(mlRuleCount));
        }

        const ruleIds = hasMlPermissions
          ? disabledRules.map(({ id }) => id)
          : disabledRulesNoML.map(({ id }) => id);

        await executeBulkAction({
          visibleRuleIds: ruleIds,
          action: BulkAction.enable,
          setLoadingRules,
          search: isAllSelected ? { query: filterQuery } : { ids: ruleIds },
        });
      };

      const handleDisableActions = async () => {
        startTransaction({ name: BULK_RULE_ACTIONS.DISABLE });
        closePopover();

        const enabledIds = selectedRules.filter(({ enabled }) => enabled).map(({ id }) => id);

        await executeBulkAction({
          visibleRuleIds: enabledIds,
          action: BulkAction.disable,
          setLoadingRules,
          search: isAllSelected ? { query: filterQuery } : { ids: enabledIds },
        });
      };

      const handleDuplicateAction = async () => {
        startTransaction({ name: BULK_RULE_ACTIONS.DUPLICATE });
        closePopover();

        await executeBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.duplicate,
          setLoadingRules,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
        clearRulesSelection();
      };

      const handleDeleteAction = async () => {
        closePopover();

        if (isAllSelected) {
          // User has cancelled deletion
          if ((await confirmDeletion()) === false) {
            return;
          }
        }

        startTransaction({ name: BULK_RULE_ACTIONS.DELETE });

        await executeBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.delete,
          setLoadingRules,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
      };

      const handleExportAction = async () => {
        closePopover();
        startTransaction({ name: BULK_RULE_ACTIONS.EXPORT });

        const response = await bulkExport({
          visibleRuleIds: selectedRuleIds,
          setLoadingRules,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });

        // if response null, likely network error happened and export rules haven't been received
        if (!response) {
          return;
        }

        const details = await getExportedRulesDetails(response);

        // if there are failed exported rules, show modal window to users.
        // they can either cancel action or proceed with export of succeeded rules
        const hasActionBeenConfirmed = await showBulkActionConfirmation(
          transformExportDetailsToDryRunResult(details),
          BulkAction.export
        );
        if (hasActionBeenConfirmed === false) {
          return;
        }

        await downloadExportedRules({ response, toasts });
      };

      const handleBulkEdit = (bulkEditActionType: BulkActionEditType) => async () => {
        let longTimeWarningToast: Toast;
        let isBulkEditFinished = false;

        closePopover();

        const dryRunResult = await executeBulkActionsDryRun({
          action: BulkAction.edit,
          editAction: bulkEditActionType,
          searchParams: isAllSelected
            ? { query: convertRulesFilterToKQL(filterOptions) }
            : { ids: selectedRuleIds },
        });

        // User has cancelled edit action or there are no custom rules to proceed
        const hasActionBeenConfirmed = await showBulkActionConfirmation(
          dryRunResult,
          BulkAction.edit
        );
        if (hasActionBeenConfirmed === false) {
          return;
        }

        const editPayload = await completeBulkEditForm(bulkEditActionType);
        if (editPayload == null) {
          return;
        }

        startTransaction({ name: BULK_RULE_ACTIONS.EDIT });

        const hideWarningToast = () => {
          if (longTimeWarningToast) {
            toasts.api.remove(longTimeWarningToast);
          }
        };

        // show warning toast only if bulk edit action exceeds 5s
        // if bulkAction already finished, we won't show toast at all (hence flag "isBulkEditFinished")
        setTimeout(() => {
          if (isBulkEditFinished) {
            return;
          }
          longTimeWarningToast = toasts.addWarning(
            {
              title: i18n.BULK_EDIT_WARNING_TOAST_TITLE,
              text: toMountPoint(
                <>
                  <p>
                    {i18n.BULK_EDIT_WARNING_TOAST_DESCRIPTION(
                      dryRunResult?.succeededRulesCount ?? 0
                    )}
                  </p>
                  <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiButton color="warning" size="s" onClick={hideWarningToast}>
                        {i18n.BULK_EDIT_WARNING_TOAST_NOTIFY}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              ),
              iconType: undefined,
            },
            { toastLifeTimeMs: 10 * 60 * 1000 }
          );
        }, 5 * 1000);

        await executeBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.edit,
          setLoadingRules,
          payload: { edit: [editPayload] },
          onFinish: () => hideWarningToast(),
          search: prepareSearchParams({
            ...(isAllSelected ? { filterOptions } : { selectedRuleIds }),
            dryRunResult,
          }),
        });

        isBulkEditFinished = true;
      };

      const isDeleteDisabled = containsLoading || selectedRuleIds.length === 0;
      const isEditDisabled =
        missingActionPrivileges || containsLoading || selectedRuleIds.length === 0;

      return [
        {
          id: 0,
          title: i18n.BULK_ACTION_MENU_TITLE,
          items: [
            {
              key: i18n.BULK_ACTION_ENABLE,
              name: i18n.BULK_ACTION_ENABLE,
              'data-test-subj': 'enableRuleBulk',
              disabled:
                missingActionPrivileges || containsLoading || (!containsDisabled && !isAllSelected),
              onClick: handleEnableAction,
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_DUPLICATE,
              name: i18n.BULK_ACTION_DUPLICATE,
              'data-test-subj': 'duplicateRuleBulk',
              disabled: isEditDisabled,
              onClick: handleDuplicateAction,
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_INDEX_PATTERNS,
              name: i18n.BULK_ACTION_INDEX_PATTERNS,
              'data-test-subj': 'indexPatternsBulkEditRule',
              disabled: isEditDisabled,
              panel: 2,
            },
            {
              key: i18n.BULK_ACTION_TAGS,
              name: i18n.BULK_ACTION_TAGS,
              'data-test-subj': 'tagsBulkEditRule',
              disabled: isEditDisabled,
              panel: 1,
            },
            {
              key: i18n.BULK_ACTION_ADD_RULE_ACTIONS,
              name: i18n.BULK_ACTION_ADD_RULE_ACTIONS,
              'data-test-subj': 'addRuleActionsBulk',
              disabled: !hasActionsPrivileges || isEditDisabled,
              onClick: handleBulkEdit(BulkActionEditType.add_rule_actions),
              toolTipContent: !hasActionsPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_SET_SCHEDULE,
              name: i18n.BULK_ACTION_SET_SCHEDULE,
              'data-test-subj': 'setScheduleBulk',
              disabled: isEditDisabled,
              onClick: handleBulkEdit(BulkActionEditType.set_schedule),
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_APPLY_TIMELINE_TEMPLATE,
              name: i18n.BULK_ACTION_APPLY_TIMELINE_TEMPLATE,
              'data-test-subj': 'applyTimelineTemplateBulk',
              disabled: isEditDisabled,
              onClick: handleBulkEdit(BulkActionEditType.set_timeline),
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_EXPORT,
              name: i18n.BULK_ACTION_EXPORT,
              'data-test-subj': 'exportRuleBulk',
              disabled: containsLoading || selectedRuleIds.length === 0,
              onClick: handleExportAction,
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_DISABLE,
              name: i18n.BULK_ACTION_DISABLE,
              'data-test-subj': 'disableRuleBulk',
              disabled:
                missingActionPrivileges || containsLoading || (!containsEnabled && !isAllSelected),
              onClick: handleDisableActions,
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_DELETE,
              name: (
                <EuiTextColor
                  color={isDeleteDisabled ? euiThemeVars.euiButtonColorDisabledText : 'danger'}
                >
                  {i18n.BULK_ACTION_DELETE}
                </EuiTextColor>
              ),
              'data-test-subj': 'deleteRuleBulk',
              disabled: isDeleteDisabled,
              onClick: handleDeleteAction,
              toolTipContent: containsImmutable
                ? i18n.BATCH_ACTION_DELETE_SELECTED_IMMUTABLE
                : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
          ],
        },
        {
          id: 1,
          title: i18n.BULK_ACTION_MENU_TITLE,
          items: [
            {
              key: i18n.BULK_ACTION_ADD_TAGS,
              name: i18n.BULK_ACTION_ADD_TAGS,
              'data-test-subj': 'addTagsBulkEditRule',
              onClick: handleBulkEdit(BulkActionEditType.add_tags),
              disabled: isEditDisabled,
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
            },
            {
              key: i18n.BULK_ACTION_DELETE_TAGS,
              name: i18n.BULK_ACTION_DELETE_TAGS,
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
          title: i18n.BULK_ACTION_MENU_TITLE,
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
    },
    [
      rules,
      selectedRuleIds,
      hasActionsPrivileges,
      isAllSelected,
      loadingRuleIds,
      startTransaction,
      hasMlPermissions,
      executeBulkAction,
      setLoadingRules,
      filterQuery,
      toasts,
      clearRulesSelection,
      confirmDeletion,
      bulkExport,
      showBulkActionConfirmation,
      executeBulkActionsDryRun,
      filterOptions,
      completeBulkEditForm,
    ]
  );

  return getBulkItemsPopoverContent;
};
