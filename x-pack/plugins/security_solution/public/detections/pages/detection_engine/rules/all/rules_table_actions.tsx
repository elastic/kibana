/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DefaultItemAction,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { NavigateToAppOptions } from '@kbn/core/public';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/common/schemas';
import { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import { Rule } from '../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import { executeRulesBulkAction, goToRuleEditPage } from './actions';
import { RulesTableActions } from './rules_table/rules_table_context';

type NavigateToApp = (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>;

export type TableColumn = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;

export const getRulesTableActions = (
  toasts: UseAppToasts,
  navigateToApp: NavigateToApp,
  invalidateRules: () => void,
  actionsPrivileges: boolean,
  setLoadingRules: RulesTableActions['setLoadingRules']
): Array<DefaultItemAction<Rule>> => [
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
      const result = await executeRulesBulkAction({
        action: BulkAction.duplicate,
        setLoadingRules,
        visibleRuleIds: [rule.id],
        toasts,
        search: { ids: [rule.id] },
      });
      invalidateRules();
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
    onClick: (rule: Rule) =>
      executeRulesBulkAction({
        action: BulkAction.export,
        setLoadingRules,
        visibleRuleIds: [rule.id],
        toasts,
        search: { ids: [rule.id] },
      }),
    enabled: (rule: Rule) => !rule.immutable,
  },
  {
    type: 'icon',
    'data-test-subj': 'deleteRuleAction',
    description: i18n.DELETE_RULE,
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: async (rule: Rule) => {
      await executeRulesBulkAction({
        action: BulkAction.delete,
        setLoadingRules,
        visibleRuleIds: [rule.id],
        toasts,
        search: { ids: [rule.id] },
      });
      invalidateRules();
    },
  },
];
