/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiTab, EuiTabs, EuiToolTip, EuiTourStep } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { useRulesTableContext } from '../../../../containers/detection_engine/rules/rules_table/rules_table_context';
import * as i18n from '../translations';
import { useFeatureTour } from './use_feature_tour';

const ToolbarLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  grid-gap: 16px;
  box-shadow: inset 0 -1px 0 #d3dae6;
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

    const {
      steps: { inMemoryTableStepProps },
      goToNextStep,
    } = useFeatureTour();

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
        <EuiTourStep {...inMemoryTableStepProps}>
          <EuiToolTip content={i18n.EXPERIMENTAL_DESCRIPTION}>
            <EuiSwitch
              label={isInMemorySorting ? i18n.EXPERIMENTAL_ON : i18n.EXPERIMENTAL_OFF}
              checked={isInMemorySorting}
              onChange={(e) => {
                goToNextStep();
                setIsInMemorySorting(e.target.checked);
              }}
            />
          </EuiToolTip>
        </EuiTourStep>
      </ToolbarLayout>
    );
  }
);

RulesTableToolbar.displayName = 'RulesTableToolbar';
