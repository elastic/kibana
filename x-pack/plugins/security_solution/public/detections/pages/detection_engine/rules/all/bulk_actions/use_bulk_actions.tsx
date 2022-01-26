/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import React, { useCallback } from 'react';
import { EuiTextColor, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import {
  BulkAction,
  BulkActionEditType,
  BulkActionEditPayload,
} from '../../../../../../../common/detection_engine/schemas/common/schemas';
import { isMlRule } from '../../../../../../../common/machine_learning/helpers';
import { displayWarningToast, useStateToaster } from '../../../../../../common/components/toasters';
import { canEditRuleWithActions } from '../../../../../../common/utils/privileges';
import { useRulesTableContext } from '../../../../../containers/detection_engine/rules/rules_table/rules_table_context';
import * as detectionI18n from '../../../translations';
import * as i18n from '../../translations';
import {
  deleteRulesAction,
  duplicateRulesAction,
  enableRulesAction,
  exportRulesAction,
  initRulesBulkAction,
} from '../actions';
import { useHasActionsPrivileges } from '../use_has_actions_privileges';
import { useHasMlPermissions } from '../use_has_ml_permissions';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { convertRulesFilterToKQL } from '../../../../../containers/detection_engine/rules/utils';

import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';
import type { BulkActionPartialErrorResponseSchema } from '../../../../../../../common/detection_engine/schemas/response/perform_bulk_action_schema';
import type { HTTPError } from '../../../../../../../common/detection_engine/types';

interface UseBulkActionsArgs {
  filterOptions: FilterOptions;
  confirmDeletion: () => Promise<boolean>;
  selectedItemsCount: number;
  confirmBulkEdit: () => Promise<boolean>;
  completeBulkEditForm: (
    bulkActionEditType: BulkActionEditType
  ) => Promise<BulkActionEditPayload | null>;
  fetchCustomRulesCount: (filterOptions: FilterOptions) => Promise<{ customRulesCount: number }>;
  reFetchTags: () => void;
}

export const useBulkActions = ({
  filterOptions,
  confirmDeletion,
  selectedItemsCount,
  confirmBulkEdit,
  completeBulkEditForm,
  fetchCustomRulesCount,
  reFetchTags,
}: UseBulkActionsArgs) => {
  const hasMlPermissions = useHasMlPermissions();
  const rulesTableContext = useRulesTableContext();
  const [, dispatchToaster] = useStateToaster();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const { api: toastsApi } = useAppToasts();
  const isRulesBulkEditEnabled = useIsExperimentalFeatureEnabled('rulesBulkEditEnabled');

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
    actions: { reFetchRules, setLoadingRules, updateRules, setIsRefreshOn },
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
          const rulesBulkAction = initRulesBulkAction({
            visibleRuleIds: ruleIds,
            selectedItemsCount,
            action: BulkAction.enable,
            setLoadingRules,
            toastsApi,
          });

          await rulesBulkAction.byQuery(filterQuery);
          await reFetchRules();
        } else {
          await enableRulesAction(ruleIds, true, dispatchToaster, setLoadingRules, updateRules);
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
            setLoadingRules,
            toastsApi,
          });

          await rulesBulkAction.byQuery(filterQuery);
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
          const rulesBulkAction = initRulesBulkAction({
            visibleRuleIds: selectedRuleIds,
            selectedItemsCount,
            action: BulkAction.duplicate,
            setLoadingRules,
            toastsApi,
          });

          await rulesBulkAction.byQuery(filterQuery);
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

          const rulesBulkAction = initRulesBulkAction({
            visibleRuleIds: selectedRuleIds,
            selectedItemsCount,
            action: BulkAction.delete,
            setLoadingRules,
            toastsApi,
          });

          await rulesBulkAction.byQuery(filterQuery);
        } else {
          await deleteRulesAction(selectedRuleIds, dispatchToaster, setLoadingRules);
        }
        await reFetchRules();
      };

      const handleExportAction = async () => {
        closePopover();
        if (isAllSelected) {
          const rulesBulkAction = initRulesBulkAction({
            visibleRuleIds: selectedRuleIds,
            selectedItemsCount,
            action: BulkAction.export,
            setLoadingRules,
            toastsApi,
          });

          await rulesBulkAction.byQuery(filterQuery);
        } else {
          await exportRulesAction(
            selectedRules.map((r) => r.rule_id),
            dispatchToaster,
            setLoadingRules
          );
        }
      };

      const handleBulkEdit = (bulkEditActionType: BulkActionEditType) => async () => {
        let longEditWarningToast;
        let isBulkEditFinished = false;
        try {
          // disabling auto-refresh so user's selected rules won't disappear after table refresh
          setIsRefreshOn(false);
          closePopover();

          const customSelectedRuleIds = selectedRules
            .filter((rule) => rule.immutable === false)
            .map((rule) => rule.id);
          let customRulesCount = customSelectedRuleIds.length;

          if (isAllSelected) {
            const res = await fetchCustomRulesCount(filterOptions);
            customRulesCount = res.customRulesCount;
          }

          // User has cancelled edit action or there are no custom rules to proceed
          if ((await confirmBulkEdit()) === false) {
            setIsRefreshOn(true);
            return;
          }

          const editPayload = await completeBulkEditForm(bulkEditActionType);
          if (editPayload == null) {
            throw Error('Bulk edit payload is empty');
          }

          // show warning toast only if bulk edit action exceeds 5s
          // if bulkAction already finished, we won't show toast at all (hence flag "isBulkEditFinished")
          setTimeout(() => {
            if (isBulkEditFinished) {
              return;
            }
            longEditWarningToast = toastsApi.addWarning(
              {
                title: i18n.BULK_EDIT_WARNING_TOAST_TITLE,
                text: i18n.BULK_EDIT_WARNING_TOAST_DESCRIPTION(customRulesCount),
              },
              { toastLifeTimeMs: 10 * 60 * 1000 }
            );
          }, 5 * 1000);

          const rulesBulkAction = initRulesBulkAction({
            visibleRuleIds: selectedRuleIds,
            selectedItemsCount: customRulesCount,
            action: BulkAction.edit,
            setLoadingRules,
            toastsApi,
            payload: { edit: [editPayload] },
            onSuccess: () => {
              toastsApi.addSuccess({
                title: i18n.BULK_EDIT_SUCCESS_TOAST_TITLE,
                text: i18n.BULK_EDIT_SUCCESS_TOAST_DESCRIPTION(customRulesCount),
              });
            },
            onError: (error: HTTPError) => {
              // if response doesn't have number of failed rules, it means the whole bulk action failed
              // and general error toast will be shown. Otherwise - error toast for partial failure
              const failedRulesCount = (error?.body as BulkActionPartialErrorResponseSchema)
                ?.attributes?.rules?.failed;

              if (isNaN(failedRulesCount)) {
                toastsApi.addError(error, { title: i18n.BULK_ACTION_FAILED });
              } else {
                try {
                  error.stack = JSON.stringify(error.body, null, 2);
                  toastsApi.addError(error, {
                    title: i18n.BULK_EDIT_ERROR_TOAST_TITLE(failedRulesCount),
                    toastMessage: i18n.BULK_EDIT_ERROR_TOAST_DESCIRPTION(failedRulesCount),
                  });
                } catch (e) {
                  // toast error has failed
                }
              }
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

          await Promise.allSettled([reFetchRules(), resolveTagsRefetch(bulkEditActionType)]);
        } catch (e) {
          // user has cancelled form or error has occured
        } finally {
          if (longEditWarningToast) {
            toastsApi.remove(longEditWarningToast);
          }
          setIsRefreshOn(true);
          isBulkEditFinished = true;
        }
      };

      const isDeleteDisabled = containsLoading || selectedRuleIds.length === 0;
      const isEditDisabled =
        missingActionPrivileges || containsLoading || selectedRuleIds.length === 0;

      return [
        {
          id: 0,
          title: isRulesBulkEditEnabled ? i18n.BULK_ACTION_MENU_TITLE : undefined,
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
              icon: isRulesBulkEditEnabled ? undefined : 'checkInCircleFilled',
            },
            {
              key: i18n.BULK_ACTION_DUPLICATE,
              name: i18n.BULK_ACTION_DUPLICATE,
              'data-test-subj': 'duplicateRuleBulk',
              disabled: isEditDisabled,
              onClick: handleDuplicateAction,
              toolTipContent: missingActionPrivileges ? i18n.EDIT_RULE_SETTINGS_TOOLTIP : undefined,
              toolTipPosition: 'right',
              icon: isRulesBulkEditEnabled ? undefined : 'crossInACircleFilled',
            },
            ...(isRulesBulkEditEnabled
              ? [
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
                ]
              : []),
            {
              key: i18n.BULK_ACTION_EXPORT,
              name: i18n.BULK_ACTION_EXPORT,
              'data-test-subj': 'exportRuleBulk',
              disabled:
                (containsImmutable && !isAllSelected) ||
                containsLoading ||
                selectedRuleIds.length === 0,
              onClick: handleExportAction,
              icon: isRulesBulkEditEnabled ? undefined : 'exportAction',
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
              icon: isRulesBulkEditEnabled ? undefined : 'copy',
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
              icon: isRulesBulkEditEnabled ? undefined : 'trash',
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
      dispatchToaster,
      selectedItemsCount,
      filterQuery,
      setLoadingRules,
      reFetchRules,
      updateRules,
      confirmDeletion,
      isRulesBulkEditEnabled,
      toastsApi,
      filterOptions,
      completeBulkEditForm,
      fetchCustomRulesCount,
      confirmBulkEdit,
      resolveTagsRefetch,
      setIsRefreshOn,
    ]
  );
};
