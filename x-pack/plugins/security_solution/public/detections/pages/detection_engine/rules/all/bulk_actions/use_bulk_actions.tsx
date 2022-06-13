/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import React, { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import {
  EuiTextColor,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiButton,
  EuiFlexItem,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';

import type { Toast } from '../../../../../../../../../../src/core/public';
import { mountReactNode } from '../../../../../../../../../../src/core/public/utils';
import {
  BulkAction,
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';
import { isMlRule } from '../../../../../../../common/machine_learning/helpers';
import { canEditRuleWithActions } from '../../../../../../common/utils/privileges';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import * as detectionI18n from '../../../translations';
import * as i18n from '../../translations';
import { executeRulesBulkAction } from '../actions';
import { useHasActionsPrivileges } from '../use_has_actions_privileges';
import { useHasMlPermissions } from '../use_has_ml_permissions';
import { getCustomRulesCountFromCache } from './use_custom_rules_count';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { convertRulesFilterToKQL } from '../../../../../containers/detection_engine/rules/utils';

import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';
import { useInvalidateRules } from '../../../../../containers/detection_engine/rules/use_find_rules_query';

interface UseBulkActionsArgs {
  filterOptions: FilterOptions;
  confirmDeletion: () => Promise<boolean>;
  confirmBulkEdit: () => Promise<boolean>;
  completeBulkEditForm: (
    bulkActionEditType: BulkActionEditType
  ) => Promise<BulkActionEditPayload | null>;
  reFetchTags: () => void;
}

export const useBulkActions = ({
  filterOptions,
  confirmDeletion,
  confirmBulkEdit,
  completeBulkEditForm,
  reFetchTags,
}: UseBulkActionsArgs) => {
  const queryClient = useQueryClient();
  const hasMlPermissions = useHasMlPermissions();
  const rulesTableContext = useRulesTableContext();
  const invalidateRules = useInvalidateRules();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const toasts = useAppToasts();
  const getIsMounted = useIsMounted();
  const filterQuery = convertRulesFilterToKQL(filterOptions);

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
    actions: { setLoadingRules, setIsRefreshOn },
  } = rulesTableContext;

  return useCallback(
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

        await executeRulesBulkAction({
          visibleRuleIds: ruleIds,
          action: BulkAction.enable,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: ruleIds },
        });
        invalidateRules();
      };

      const handleDisableActions = async () => {
        closePopover();
        const enabledIds = selectedRules.filter(({ enabled }) => enabled).map(({ id }) => id);
        await executeRulesBulkAction({
          visibleRuleIds: enabledIds,
          action: BulkAction.disable,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: enabledIds },
        });
        invalidateRules();
      };

      const handleDuplicateAction = async () => {
        closePopover();
        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.duplicate,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
        invalidateRules();
      };

      const handleDeleteAction = async () => {
        closePopover();
        if (isAllSelected) {
          if ((await confirmDeletion()) === false) {
            // User has cancelled deletion
            return;
          }
        }

        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.delete,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
        invalidateRules();
      };

      const handleExportAction = async () => {
        closePopover();

        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.export,
          setLoadingRules,
          toasts,
          search: isAllSelected ? { query: filterQuery } : { ids: selectedRuleIds },
        });
      };

      const handleBulkEdit = (bulkEditActionType: BulkActionEditType) => async () => {
        let longTimeWarningToast: Toast;
        let isBulkEditFinished = false;

        // disabling auto-refresh so user's selected rules won't disappear after table refresh
        setIsRefreshOn(false);
        closePopover();

        const customSelectedRuleIds = selectedRules
          .filter((rule) => rule.immutable === false)
          .map((rule) => rule.id);

        // User has cancelled edit action or there are no custom rules to proceed
        if ((await confirmBulkEdit()) === false) {
          setIsRefreshOn(true);
          return;
        }

        const editPayload = await completeBulkEditForm(bulkEditActionType);
        if (editPayload == null) {
          setIsRefreshOn(true);
          return;
        }

        const hideWarningToast = () => {
          if (longTimeWarningToast) {
            toasts.api.remove(longTimeWarningToast);
          }
        };

        const customRulesCount = isAllSelected
          ? getCustomRulesCountFromCache(queryClient)
          : customSelectedRuleIds.length;

        // show warning toast only if bulk edit action exceeds 5s
        // if bulkAction already finished, we won't show toast at all (hence flag "isBulkEditFinished")
        setTimeout(() => {
          if (isBulkEditFinished) {
            return;
          }
          longTimeWarningToast = toasts.addWarning(
            {
              title: i18n.BULK_EDIT_WARNING_TOAST_TITLE,
              text: mountReactNode(
                <>
                  <p>{i18n.BULK_EDIT_WARNING_TOAST_DESCRIPTION(customRulesCount)}</p>
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

        await executeRulesBulkAction({
          visibleRuleIds: selectedRuleIds,
          action: BulkAction.edit,
          setLoadingRules,
          toasts,
          payload: { edit: [editPayload] },
          onFinish: () => hideWarningToast(),
          search: isAllSelected
            ? {
                query: convertRulesFilterToKQL({
                  ...filterOptions,
                  showCustomRules: true, // only edit custom rules, as elastic rule are immutable
                }),
              }
            : { ids: customSelectedRuleIds },
        });

        isBulkEditFinished = true;
        invalidateRules();
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
              disabled:
                (containsImmutable && !isAllSelected) ||
                containsLoading ||
                selectedRuleIds.length === 0,
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
      hasMlPermissions,
      invalidateRules,
      setLoadingRules,
      toasts,
      filterQuery,
      confirmDeletion,
      setIsRefreshOn,
      confirmBulkEdit,
      completeBulkEditForm,
      queryClient,
      getIsMounted,
      filterOptions,
      resolveTagsRefetch,
    ]
  );
};
