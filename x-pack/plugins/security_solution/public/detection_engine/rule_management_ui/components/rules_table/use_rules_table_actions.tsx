/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultItemAction } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { BulkAction } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useKibana } from '../../../../common/lib/kibana';
import { canEditRuleWithActions } from '../../../../common/utils/privileges';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../rule_management/logic';
import {
  downloadExportedRules,
  useBulkExport,
} from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useHasActionsPrivileges } from './use_has_actions_privileges';

export const useRulesTableActions = (): Array<DefaultItemAction<Rule>> => {
  const { navigateToApp } = useKibana().services.application;
  const hasActionsPrivileges = useHasActionsPrivileges();
  const toasts = useAppToasts();
  const { setLoadingRules } = useRulesTableContext().actions;
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction();
  const { bulkExport } = useBulkExport();

  return [
    {
      type: 'icon',
      'data-test-subj': 'editRuleAction',
      description: i18n.EDIT_RULE_SETTINGS,
      name: !hasActionsPrivileges ? (
        <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
          <>{i18n.EDIT_RULE_SETTINGS}</>
        </EuiToolTip>
      ) : (
        i18n.EDIT_RULE_SETTINGS
      ),
      icon: 'controlsHorizontal',
      onClick: (rule: Rule) => goToRuleEditPage(rule.id, navigateToApp),
      enabled: (rule: Rule) => canEditRuleWithActions(rule, hasActionsPrivileges),
    },
    {
      type: 'icon',
      'data-test-subj': 'duplicateRuleAction',
      description: i18n.DUPLICATE_RULE,
      icon: 'copy',
      name: !hasActionsPrivileges ? (
        <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
          <>{i18n.DUPLICATE_RULE}</>
        </EuiToolTip>
      ) : (
        i18n.DUPLICATE_RULE
      ),
      enabled: (rule: Rule) => canEditRuleWithActions(rule, hasActionsPrivileges),
      // TODO extract those handlers to hooks, like useDuplicateRule
      onClick: async (rule: Rule) => {
        startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
        const result = await executeBulkAction({
          action: BulkAction.duplicate,
          setLoadingRules,
          visibleRuleIds: [rule.id],
          search: { ids: [rule.id] },
        });
        const createdRules = result?.attributes.results.created;
        if (createdRules?.length) {
          goToRuleEditPage(createdRules[0].id, navigateToApp);
        }
      },
    },
    {
      type: 'icon',
      'data-test-subj': 'exportRuleAction',
      description: i18n.EXPORT_RULE,
      icon: 'exportAction',
      name: i18n.EXPORT_RULE,
      onClick: async (rule: Rule) => {
        startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
        const response = await bulkExport({
          setLoadingRules,
          visibleRuleIds: [rule.id],
          search: { ids: [rule.id] },
        });
        if (response) {
          await downloadExportedRules({
            response,
            toasts,
          });
        }
      },
      enabled: (rule: Rule) => !rule.immutable,
    },
    {
      type: 'icon',
      'data-test-subj': 'deleteRuleAction',
      description: i18n.DELETE_RULE,
      icon: 'trash',
      name: i18n.DELETE_RULE,
      onClick: async (rule: Rule) => {
        startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
        await executeBulkAction({
          action: BulkAction.delete,
          setLoadingRules,
          visibleRuleIds: [rule.id],
          search: { ids: [rule.id] },
        });
      },
    },
  ];
};
