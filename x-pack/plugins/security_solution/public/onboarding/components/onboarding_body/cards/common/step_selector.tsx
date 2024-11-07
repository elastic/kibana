/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Dispatch } from 'react';
import React from 'react';
import {
  EuiPanel,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiBackgroundColor,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

export interface Step {
  id: string;
  title: string;
  description: string;
  asset: {
    type: 'video' | 'image';
    source: string;
    alt: string;
  };
}

interface StepSelectorProps {
  steps: Step[];
  onSelect: Dispatch<Step>;
  selectedStep: Step;
  title?: string;
}

export const StepSelector = React.memo<StepSelectorProps>(
  ({ steps, onSelect, selectedStep, title }) => {
    const { euiTheme } = useEuiTheme();
    const itemBackgroundColor = useEuiBackgroundColor('primary');

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        {title && (
          <EuiFlexItem>
            <EuiText data-test-subj="rulesCardDescription" size="xs" style={{ fontWeight: 500 }}>
              {title}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup
            style={{ maxHeight: '190px', width: '100%', overflowY: 'auto', padding: '10px 0' }}
            direction="column"
            gutterSize="s"
          >
            {steps.map((step) => (
              <EuiFlexItem grow={false}>
                <EuiPanel
                  hasBorder
                  style={
                    selectedStep.id === step.id
                      ? {
                          border: `1px solid ${euiTheme.colors.primary}`,
                          backgroundColor: `${itemBackgroundColor}`,
                        }
                      : {}
                  }
                  color={selectedStep.id === step.id ? 'subdued' : 'plain'}
                  element="button"
                  onClick={() => {
                    onSelect(step);
                  }}
                >
                  <EuiTitle data-test-subj="rulesCardDescription" size="xxs">
                    <h5>{step.title}</h5>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText data-test-subj="rulesCardDescription" size="xs">
                    {step.description}
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
StepSelector.displayName = 'StepSelector';
