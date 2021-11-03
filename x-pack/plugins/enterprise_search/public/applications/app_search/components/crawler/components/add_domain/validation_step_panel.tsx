/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { CrawlerDomainValidationStep } from '../../types';

import { domainValidationStateToPanelColor } from './utils';
import { ValidationStateIcon } from './validation_state_icon';

interface ValidationStepPanelProps {
  step: CrawlerDomainValidationStep;
  label: string;
  action?: React.ReactNode;
}

export const ValidationStepPanel: React.FC<ValidationStepPanelProps> = ({
  step,
  label,
  action,
}) => {
  const showErrorMessage = step.state === 'invalid' || step.state === 'warning';

  return (
    <EuiPanel hasShadow={false} color={domainValidationStateToPanelColor(step.state)}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <ValidationStateIcon state={step.state} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{label}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showErrorMessage && (
        <>
          <EuiSpacer size="xs" />
          <EuiMarkdownFormat textSize="s" data-test-subj="errorMessage">
            {step.message || ''}
          </EuiMarkdownFormat>
          {action && (
            <>
              <EuiSpacer size="s" />
              {action}
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
