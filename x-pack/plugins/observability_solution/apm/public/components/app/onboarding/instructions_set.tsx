/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSplitPanel, EuiTabs, EuiTab, EuiTitle, EuiSteps, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useEuiTheme } from '@elastic/eui';
import {
  INSTRUCTION_VARIANT,
  getDisplayText,
  InstructionVariant,
  InstructionSet,
} from './instruction_variants';
import { useApmParams } from '../../../hooks/use_apm_params';
import { push } from '../../shared/links/url_helpers';

interface AgentTab {
  id: INSTRUCTION_VARIANT;
  text: string;
}

function getTabs(variants: InstructionVariant[]): AgentTab[] {
  return variants.map((variant) => ({
    id: variant.id,
    text: getDisplayText(variant.id),
  }));
}

export function InstructionsSet({ instructions }: { instructions: InstructionSet }) {
  const tabs = getTabs(instructions.instructionVariants);

  const {
    query: { agent: agentQuery },
  } = useApmParams('/onboarding');
  const history = useHistory();
  const selectedTab = agentQuery ?? tabs[0].id;
  const onSelectedTabChange = (agent: string) => {
    push(history, { query: { agent } });
  };
  const { euiTheme } = useEuiTheme();

  function InstructionTabs({ agentTabs }: { agentTabs: AgentTab[] }) {
    return (
      <EuiTabs style={{ padding: `0 ${euiTheme.size.l}` }}>
        {agentTabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTab}
            onClick={() => onSelectedTabChange(tab.id)}
          >
            {tab.text}
          </EuiTab>
        ))}
      </EuiTabs>
    );
  }

  function InstructionSteps({
    instructionVariants,
    tab,
  }: {
    instructionVariants: InstructionVariant[];
    tab: string;
  }) {
    const selectInstructionSteps = instructionVariants.find((variant) => {
      return variant.id === tab;
    });

    if (!selectInstructionSteps) {
      return <></>;
    }

    return <EuiSteps titleSize="xs" steps={selectInstructionSteps.instructions} />;
  }

  return (
    <EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner color="subdued" paddingSize="none">
        <InstructionTabs agentTabs={tabs} />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiTitle size="m">
          <h2>{instructions.title}</h2>
        </EuiTitle>
        <EuiSpacer />
        <InstructionSteps
          instructionVariants={instructions.instructionVariants}
          tab={selectedTab}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
