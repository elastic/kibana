/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultItemAction } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import type { Rule } from '../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import {
  goToRuleEditPage,
  bulkExportRules,
  performTrackableBulkAction,
  showBulkSuccessToast,
  showBulkErrorToast,
} from './actions';
import type { RulesTableActions } from './rules_table/rules_table_context';
import type { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { SINGLE_RULE_ACTIONS } from '../../../../../common/lib/apm/user_actions';

type NavigateToApp = (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>;

export const getRulesTableActions = ({
  toasts,
  navigateToApp,
  invalidateRules,
  invalidatePrePackagedRulesStatus,
  actionsPrivileges,
  setLoadingRules,
  startTransaction,
}: {
  toasts: UseAppToasts;
  navigateToApp: NavigateToApp;
  invalidateRules: () => void;
  invalidatePrePackagedRulesStatus: () => void;
  actionsPrivileges: boolean;
  setLoadingRules: RulesTableActions['setLoadingRules'];
  startTransaction: ReturnType<typeof useStartTransaction>['startTransaction'];
}): Array<DefaultItemAction<Rule>> => [
  {
    type: 'icon',
    'data-test-subj': 'editRuleAction',
    description: i18n.EDIT_RULE_SETTINGS,
    name: !actionsPrivileges ? (
      <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
        <>{i18n.EDIT_RULE_SETTINGS}</>
      </EuiToolTip>
    ) : (
      i18n.EDIT_RULE_SETTINGS
    ),
    icon: 'controlsHorizontal',
    onClick: (rule: Rule) => goToRuleEditPage(rule.id, navigateToApp),
    enabled: (rule: Rule) => canEditRuleWithActions(rule, actionsPrivileges),
  },
  {
    type: 'icon',
    'data-test-subj': 'duplicateRuleAction',
    description: i18n.DUPLICATE_RULE,
    icon: 'copy',
    name: !actionsPrivileges ? (
      <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
        <>{i18n.DUPLICATE_RULE}</>
      </EuiToolTip>
    ) : (
      i18n.DUPLICATE_RULE
    ),
    enabled: (rule: Rule) => canEditRuleWithActions(rule, actionsPrivileges),
    onClick: async (rule: Rule) => {
      const action = BulkAction.duplicate;

      startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
      setLoadingRules({ ids: [rule.id], action });

      try {
        const response = await performTrackableBulkAction(action, [rule.id]);
        const createdRules = response.attributes.results.created;

        if (createdRules.length > 0) {
          goToRuleEditPage(createdRules[0].id, navigateToApp);
        }

        showBulkSuccessToast(toasts, action, response.attributes.summary);
      } catch (e) {
        showBulkErrorToast(toasts, action, e);
      }

      setLoadingRules({ ids: [], action: null });
      invalidateRules();
      invalidatePrePackagedRulesStatus();
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
      setLoadingRules({ ids: [rule.id], action: BulkAction.export });

      await bulkExportRules([rule.id], toasts);

      setLoadingRules({ ids: [], action: null });
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
      const action = BulkAction.delete;

      startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
      setLoadingRules({ ids: [rule.id], action });

      try {
        const response = await performTrackableBulkAction(action, [rule.id]);

        showBulkSuccessToast(toasts, action, response.attributes.summary);
      } catch (e) {
        showBulkErrorToast(toasts, action, e);
      }

      setLoadingRules({ ids: [], action: null });
      invalidateRules();
      invalidatePrePackagedRulesStatus();
    },
  },
];
