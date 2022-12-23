/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { TabNavigationWithBreadcrumbs } from '../../../../common/components/navigation/tab_navigation_with_breadcrumbs';
import { useRulesTableContext } from './rules_table/rules_table_context';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { RULES_TABLE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';

const ToolbarLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  grid-gap: 16px;
  box-shadow: inset 0 -1px 0 ${({ theme }) => theme.eui.euiBorderColor};
`;

export enum AllRulesTabs {
  management = 'management',
  monitoring = 'monitoring',
}

export const RulesTableToolbar = React.memo(() => {
  const {
    state: { isInMemorySorting },
    actions: { setIsInMemorySorting },
  } = useRulesTableContext();
  const { startTransaction } = useStartTransaction();
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

  const handleInMemorySwitch = useCallback(
    (e: EuiSwitchEvent) => {
      startTransaction({
        name: isInMemorySorting ? RULES_TABLE_ACTIONS.PREVIEW_OFF : RULES_TABLE_ACTIONS.PREVIEW_ON,
      });
      setIsInMemorySorting(e.target.checked);
    },
    [isInMemorySorting, setIsInMemorySorting, startTransaction]
  );

  return (
    <ToolbarLayout>
      <TabNavigationWithBreadcrumbs navTabs={ruleTabs} />
      <EuiToolTip content={i18n.EXPERIMENTAL_DESCRIPTION}>
        <EuiSwitch
          data-test-subj={
            isInMemorySorting
              ? 'allRulesTableTechnicalPreviewOff'
              : 'allRulesTableTechnicalPreviewOn'
          }
          label={isInMemorySorting ? i18n.EXPERIMENTAL_ON : i18n.EXPERIMENTAL_OFF}
          checked={isInMemorySorting}
          onChange={handleInMemorySwitch}
        />
      </EuiToolTip>
    </ToolbarLayout>
  );
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
