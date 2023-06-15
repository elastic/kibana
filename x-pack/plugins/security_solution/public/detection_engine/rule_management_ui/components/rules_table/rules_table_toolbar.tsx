/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import * as i18n from './translations';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';

export enum AllRulesTabs {
  management = 'management',
  monitoring = 'monitoring',
  updates = 'updates',
}

export const RulesTableToolbar = React.memo(() => {
  const {
    state: {
      pagination: { total: installedTotal },
    },
  } = useRulesTableContext();

  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();

  const updateTotal = prebuiltRulesStatus?.num_prebuilt_rules_to_upgrade ?? 0;

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
    }),
    [installedTotal, updateTotal]
  );

  return <TabNavigation navTabs={ruleTabs} />;
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
