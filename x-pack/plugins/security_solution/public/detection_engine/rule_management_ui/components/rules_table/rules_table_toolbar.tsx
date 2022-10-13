/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch, EuiTab, EuiTabs, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';
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

interface RulesTableToolbarProps {
  activeTab: AllRulesTabs;
  onTabChange: (tab: AllRulesTabs) => void;
}

export enum AllRulesTabs {
  rules = 'rules',
  monitoring = 'monitoring',
}

const allRulesTabs = [
  {
    id: AllRulesTabs.rules,
    name: i18n.RULES_TAB,
    disabled: false,
  },
  {
    id: AllRulesTabs.monitoring,
    name: i18n.MONITORING_TAB,
    disabled: false,
  },
];

export const RulesTableToolbar = React.memo<RulesTableToolbarProps>(
  ({ onTabChange, activeTab }) => {
    const {
      state: { isInMemorySorting },
      actions: { setIsInMemorySorting },
    } = useRulesTableContext();
    const { startTransaction } = useStartTransaction();

    const handleInMemorySwitch = useCallback(
      (e: EuiSwitchEvent) => {
        startTransaction({
          name: isInMemorySorting
            ? RULES_TABLE_ACTIONS.PREVIEW_OFF
            : RULES_TABLE_ACTIONS.PREVIEW_ON,
        });
        setIsInMemorySorting(e.target.checked);
      },
      [isInMemorySorting, setIsInMemorySorting, startTransaction]
    );

    return (
      <ToolbarLayout>
        <EuiTabs>
          {allRulesTabs.map((tab) => (
            <EuiTab
              data-test-subj={`allRulesTableTab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              isSelected={tab.id === activeTab}
              disabled={tab.disabled}
              key={tab.id}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
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
  }
);

RulesTableToolbar.displayName = 'RulesTableToolbar';
