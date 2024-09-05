/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSplitPanel,
  EuiTabs,
  EuiTab,
  EuiTitle,
  EuiSteps,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
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

function InstructionTabs({
  agentTabs,
  selectedTab,
}: {
  agentTabs: AgentTab[];
  selectedTab: string;
}) {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();

  const onSelectedTabChange = (agent: string) => {
    push(history, { query: { agent } });
  };

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
  selectedTab,
}: {
  instructionVariants: InstructionVariant[];
  selectedTab: string;
}) {
  const selectInstructionSteps = instructionVariants.find((variant) => {
    return variant.id === selectedTab;
  });

  if (!selectInstructionSteps) {
    return <></>;
  }

  return <EuiSteps titleSize="xs" steps={selectInstructionSteps.instructions} />;
}

export function InstructionsSet({ instructions }: { instructions: InstructionSet }) {
  const tabs = useMemo(() => getTabs(instructions.instructionVariants), [instructions]);

  const {
    query: { agent: agentQuery },
  } = useApmParams('/onboarding');
  const selectedTab = agentQuery ?? tabs[0].id;

  return (
    <EuiSplitPanel.Outer>
      <EuiSplitPanel.Inner color="subdued" paddingSize="none">
        <InstructionTabs agentTabs={tabs} selectedTab={selectedTab} />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="l">
        <EuiTitle size="m">
          <h2>{instructions.title}</h2>
        </EuiTitle>
        <EuiSpacer />
        <InstructionSteps
          instructionVariants={instructions.instructionVariants}
          selectedTab={selectedTab}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
