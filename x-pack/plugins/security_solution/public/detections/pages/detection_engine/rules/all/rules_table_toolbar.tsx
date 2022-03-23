/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiTab, EuiTabs, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { useRulesTableContext } from './rules_table/rules_table_context';
import * as i18n from '../translations';
import { useRulesFeatureTourContext } from './rules_feature_tour_context';
import { OptionalEuiTourStep } from './optional_eui_tour_step';

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
  loading: boolean;
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
  ({ onTabChange, activeTab, loading }) => {
    const {
      state: { isInMemorySorting },
      actions: { setIsInMemorySorting },
    } = useRulesTableContext();

    const {
      steps: { inMemoryTableStepProps },
      goToNextStep,
    } = useRulesFeatureTourContext();

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
        {/* delaying render of tour due to EuiPopover can't react to layout changes
        https://github.com/elastic/kibana/pull/124343#issuecomment-1032467614 */}
        <OptionalEuiTourStep stepProps={loading ? undefined : inMemoryTableStepProps}>
          <EuiToolTip content={i18n.EXPERIMENTAL_DESCRIPTION}>
            <EuiSwitch
              label={isInMemorySorting ? i18n.EXPERIMENTAL_ON : i18n.EXPERIMENTAL_OFF}
              checked={isInMemorySorting}
              onChange={(e) => {
                if (inMemoryTableStepProps.isStepOpen) {
                  goToNextStep();
                }
                setIsInMemorySorting(e.target.checked);
              }}
            />
          </EuiToolTip>
        </OptionalEuiTourStep>
      </ToolbarLayout>
    );
  }
);

RulesTableToolbar.displayName = 'RulesTableToolbar';
