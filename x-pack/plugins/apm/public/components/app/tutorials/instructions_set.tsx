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
} from '@elastic/eui';
import React, { useState } from 'react';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { INSTRUCTION_VARIANT, getDisplayText } from './instruction_variants';

interface InstructionVariant {
  id: INSTRUCTION_VARIANT;
  instructions: EuiStepProps[];
}

interface InstructionSetProps {
  instructions: {
    title: string;
    instructionVariants: InstructionVariant[];
  };
}

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

export function InstructionsSet({ instructions }: InstructionSetProps) {
  const tabs = getTabs(instructions.instructionVariants);

  const [selectedTab, setSelectedTab] = useState<string>(tabs[0].id);
  const onSelectedTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  function InstructionTabs({ agentTabs }: { agentTabs: AgentTab[] }) {
    return (
      <EuiTabs>
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

    return (
      <EuiSteps titleSize="xs" steps={selectInstructionSteps.instructions} />
    );
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
