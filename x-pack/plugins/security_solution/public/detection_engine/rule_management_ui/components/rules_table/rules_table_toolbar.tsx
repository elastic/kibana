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

interface RulesTableToolbarProps {
  installedTotal?: number;
  updateTotal?: number;
  newTotal?: number;
}

export const RulesTableToolbar = React.memo<RulesTableToolbarProps>(
  ({ installedTotal, newTotal, updateTotal }) => {
    const ruleTabs = useMemo(
      () => ({
        [AllRulesTabs.installed]: {
          id: AllRulesTabs.installed,
          name: i18n.INSTALLED_RULES_TAB,
          disabled: false,
          href: `/rules/${AllRulesTabs.installed}`,
          isBeta: !!(installedTotal ?? 0 > 0),
          betaOptions: {
            text: `${installedTotal}`,
          },
        },
        [AllRulesTabs.monitoring]: {
          id: AllRulesTabs.monitoring,
          name: i18n.RULE_MONITORING_TAB,
          disabled: false,
          href: `/rules/${AllRulesTabs.monitoring}`,
          isBeta: !!(installedTotal ?? 0 > 0),
          betaOptions: {
            text: `${installedTotal}`,
          },
        },
        [AllRulesTabs.updates]: {
          id: AllRulesTabs.updates,
          name: i18n.RULE_UPDATES_TAB,
          disabled: false,
          href: `/rules/${AllRulesTabs.updates}`,
          isBeta: !!(updateTotal ?? 0 > 0),
          betaOptions: {
            text: `${updateTotal}`,
          },
        },
        [AllRulesTabs.addRules]: {
          id: AllRulesTabs.addRules,
          name: i18n.ADD_RULES_TAB,
          disabled: false,
          href: `/rules/${AllRulesTabs.addRules}`,
          isBeta: !!(newTotal ?? 0 > 0),
          betaOptions: {
            text: `${newTotal}`,
          },
        },
      }),
      []
    );

    return <TabNavigationWithBreadcrumbs navTabs={ruleTabs} />;
  }
);

RulesTableToolbar.displayName = 'RulesTableToolbar';
