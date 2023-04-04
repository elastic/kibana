/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TabNavigationWithBreadcrumbs } from '../../../../common/components/navigation/tab_navigation_with_breadcrumbs';
import * as i18n from './translations';

export enum AllRulesTabs {
  installed = 'installed',
  monitoring = 'monitoring',
  updates = 'updates',
  addRules = 'addRules',
}

export const RulesTableToolbar = React.memo(() => {
  const ruleTabs = useMemo(
    () => ({
      [AllRulesTabs.installed]: {
        id: AllRulesTabs.installed,
        name: i18n.INSTALLED_RULES_TAB(731),
        disabled: false,
        href: `/rules/${AllRulesTabs.installed}`,
      },
      [AllRulesTabs.monitoring]: {
        id: AllRulesTabs.monitoring,
        name: i18n.RULE_MONITORING_TAB(731),
        disabled: false,
        href: `/rules/${AllRulesTabs.monitoring}`,
      },
      [AllRulesTabs.updates]: {
        id: AllRulesTabs.updates,
        name: i18n.RULE_UPDATES_TAB(4),
        disabled: false,
        href: `/rules/${AllRulesTabs.updates}`,
      },
      [AllRulesTabs.addRules]: {
        id: AllRulesTabs.addRules,
        name: i18n.ADD_RULES_TAB(23),
        disabled: false,
        href: `/rules/${AllRulesTabs.addRules}`,
      },
    }),
    []
  );

  return <TabNavigationWithBreadcrumbs navTabs={ruleTabs} />;
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
