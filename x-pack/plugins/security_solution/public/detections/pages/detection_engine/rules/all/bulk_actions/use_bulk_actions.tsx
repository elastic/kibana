/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import React, { useCallback } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiTextColor, EuiFlexGroup, EuiButton, EuiFlexItem } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';

import type { Toast } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { BulkActionEditPayload } from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import {
  BulkAction,
  BulkActionEditType,
} from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { isMlRule } from '../../../../../../../common/machine_learning/helpers';
import { canEditRuleWithActions } from '../../../../../../common/utils/privileges';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import * as detectionI18n from '../../../translations';
import * as i18n from '../../translations';
import { executeRulesBulkAction, downloadExportedRules } from '../actions';
import { getExportedRulesDetails } from '../helpers';
import { useHasActionsPrivileges } from '../use_has_actions_privileges';
import { useHasMlPermissions } from '../use_has_ml_permissions';
import { transformExportDetailsToDryRunResult } from './utils/dry_run_result';
import type { ExecuteBulkActionsDryRun } from './use_bulk_actions_dry_run';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { convertRulesFilterToKQL } from '../../../../../containers/detection_engine/rules/utils';
import { prepareSearchParams } from './utils/prepare_search_params';
import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';
import {
  useInvalidateRules,
  useUpdateRulesCache,
} from '../../../../../containers/detection_engine/rules/use_find_rules_query';
import { BULK_RULE_ACTIONS } from '../../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../../common/lib/apm/use_start_transaction';
import { useInvalidatePrePackagedRulesStatus } from '../../../../../containers/detection_engine/rules/use_pre_packaged_rules_status';

import type { DryRunResult, BulkActionForConfirmation } from './types';

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
  reFetchTags: () => void;
  executeBulkActionsDryRun: ExecuteBulkActionsDryRun;
}

export const useBulkActions = ({
  filterOptions,
  confirmDeletion,
  showBulkActionConfirmation,
  completeBulkEditForm,
  reFetchTags,
  executeBulkActionsDryRun,
}: UseBulkActionsArgs) => {
  const hasMlPermissions = useHasMlPermissions();
  const rulesTableContext = useRulesTableContext();
  const invalidateRules = useInvalidateRules();
  const updateRulesCache = useUpdateRulesCache();
  const invalidatePrePackagedRulesStatus = useInvalidatePrePackagedRulesStatus();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const toasts = useAppToasts();
  const getIsMounted = useIsMounted();
  const filterQuery = convertRulesFilterToKQL(filterOptions);
  const { startTransaction } = useStartTransaction();

  // refetch tags if edit action is related to tags: add_tags/delete_tags/set_tags
  const resolveTagsRefetch = useCallback(
    async (bulkEditActionType: BulkActionEditType) => {
      const isTagsAction = [
        BulkActionEditType.add_tags,
        BulkActionEditType.set_tags,
        BulkActionEditType.delete_tags,
      ].includes(bulkEditActionType);

      return isTagsAction ? reFetchTags() : null;
    },
    [reFetchTags]
  );

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

        const res = await executeRulesBulkAction({
          visibleRuleIds: ruleIds,
          action: BulkAction.enable,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: ruleIds },
        });
        updateRulesCache(res?.attributes?.results?.updated ?? []);
      };

      const handleDisableActions = async () => {
        startTransaction({ name: BULK_RULE_ACTIONS.DISABLE });
        closePopover();

        const enabledIds = selectedRules.filter(({ enabled }) => enabled).map(({ id }) => id);

        const res = await executeRulesBulkAction({
          visibleRuleIds: enabledIds,
          action: BulkAction.disable,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: enabledIds },
        });
        updateRulesCache(res?.attributes?.results?.updated ?? []);
      };

      const handleDuplicateAction = async () => {
        startTransaction({ name: BULK_RULE_ACTIONS.DUPLICATE });
        closePopover();

        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.duplicate,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
        invalidateRules();
        // We use prePackagedRulesStatus to display Prebuilt/Custom rules
        // counters, so we need to invalidate it when the total number of rules
        // changes.
        invalidatePrePackagedRulesStatus();
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

        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.delete,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
        invalidateRules();
        // We use prePackagedRulesStatus to display Prebuilt/Custom rules
        // counters, so we need to invalidate it when the total number of rules
        // changes.
        invalidatePrePackagedRulesStatus();
      };

      const handleExportAction = async () => {
        closePopover();
        startTransaction({ name: BULK_RULE_ACTIONS.EXPORT });

        const response = await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.export,
          setLoadingRules,
          toasts,
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

        // disabling auto-refresh so user's selected rules won't disappear after table refresh
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

        const res = await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.edit,
          setLoadingRules,
          toasts,
          payload: { edit: [editPayload] },
          onFinish: () => hideWarningToast(),
          search: prepareSearchParams({
            ...(isAllSelected ? { filterOptions } : { selectedRuleIds }),
            dryRunResult,
          }),
        });

        isBulkEditFinished = true;
        updateRulesCache(res?.attributes?.results?.updated ?? []);
        if (getIsMounted()) {
          await resolveTagsRefetch(bulkEditActionType);
        }
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
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_DUPLICATE,
              name: i18n.BULK_ACTION_DUPLICATE,
              'data-test-subj': 'duplicateRuleBulk',
              disabled: isEditDisabled,
              onClick: handleDuplicateAction,
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
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
              toolTipContent: !hasActionsPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_SET_SCHEDULE,
              name: i18n.BULK_ACTION_SET_SCHEDULE,
              'data-test-subj': 'setScheduleBulk',
              disabled: isEditDisabled,
              onClick: handleBulkEdit(BulkActionEditType.set_schedule),
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
              toolTipPosition: 'right',
              icon: undefined,
            },
            {
              key: i18n.BULK_ACTION_APPLY_TIMELINE_TEMPLATE,
              name: i18n.BULK_ACTION_APPLY_TIMELINE_TEMPLATE,
              'data-test-subj': 'applyTimelineTemplateBulk',
              disabled: isEditDisabled,
              onClick: handleBulkEdit(BulkActionEditType.set_timeline),
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
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
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
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
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
              toolTipPosition: 'right',
            },
            {
              key: i18n.BULK_ACTION_DELETE_TAGS,
              name: i18n.BULK_ACTION_DELETE_TAGS,
              'data-test-subj': 'deleteTagsBulkEditRule',
              onClick: handleBulkEdit(BulkActionEditType.delete_tags),
              disabled: isEditDisabled,
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
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
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
              toolTipPosition: 'right',
            },
            {
              key: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
              name: i18n.BULK_ACTION_DELETE_INDEX_PATTERNS,
              'data-test-subj': 'deleteIndexPatternsBulkEditRule',
              onClick: handleBulkEdit(BulkActionEditType.delete_index_patterns),
              disabled: isEditDisabled,
              toolTipContent: missingActionPrivileges
                ? i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                : undefined,
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
      setLoadingRules,
      toasts,
      filterQuery,
      updateRulesCache,
      invalidateRules,
      invalidatePrePackagedRulesStatus,
      clearRulesSelection,
      confirmDeletion,
      showBulkActionConfirmation,
      executeBulkActionsDryRun,
      filterOptions,
      completeBulkEditForm,
      getIsMounted,
      resolveTagsRefetch,
    ]
  );

  return getBulkItemsPopoverContent;
};
