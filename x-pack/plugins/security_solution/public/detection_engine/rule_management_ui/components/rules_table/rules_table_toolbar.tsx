/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useUserData } from '../../../../detections/components/user_info';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import * as i18n from './translations';

export enum AllRulesTabs {
  management = 'management',
  monitoring = 'monitoring',
  updates = 'updates',
}

export const RulesTableToolbar = React.memo(() => {
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();

  const [{ loading, canUserCRUD }] = useUserData();

  const installedTotal =
    (ruleManagementFilters?.rules_summary.custom_count ?? 0) +
    (ruleManagementFilters?.rules_summary.prebuilt_installed_count ?? 0);
  const updateTotal = prebuiltRulesStatus?.num_prebuilt_rules_to_upgrade ?? 0;

  const shouldDisplayRuleUpdatesTab = !loading && canUserCRUD && updateTotal > 0;

  const ruleTabs = useMemo(
    () => ({
      [AllRulesTabs.management]: {
        id: AllRulesTabs.management,
        name: i18n.INSTALLED_RULES_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.management}`,
        isBeta: installedTotal > 0,
        betaOptions: {
          text: `${installedTotal}`,
        },
      },
      [AllRulesTabs.monitoring]: {
        id: AllRulesTabs.monitoring,
        name: i18n.RULE_MONITORING_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.monitoring}`,
        isBeta: installedTotal > 0,
        betaOptions: {
          text: `${installedTotal}`,
        },
      },
      ...(shouldDisplayRuleUpdatesTab
        ? {
            [AllRulesTabs.updates]: {
              id: AllRulesTabs.updates,
              name: i18n.RULE_UPDATES_TAB,
              disabled: false,
              href: `/rules/${AllRulesTabs.updates}`,
              isBeta: updateTotal > 0,
              betaOptions: {
                text: `${updateTotal}`,
              },
            },
          }
        : {}),
    }),
    [installedTotal, updateTotal, shouldDisplayRuleUpdatesTab]
  );

  return <TabNavigation navTabs={ruleTabs} />;
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
