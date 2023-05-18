/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';

export enum AllRulesTabs {
  management = 'management',
  monitoring = 'monitoring',
}

export const RulesTableToolbar = React.memo(() => {
  const ruleTabs = useMemo(
    () => ({
      [AllRulesTabs.management]: {
        id: AllRulesTabs.management,
        name: i18n.RULES_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.management}`,
      },
      [AllRulesTabs.monitoring]: {
        id: AllRulesTabs.monitoring,
        name: i18n.MONITORING_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.monitoring}`,
      },
    }),
    []
  );

  return <TabNavigation navTabs={ruleTabs} />;
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
