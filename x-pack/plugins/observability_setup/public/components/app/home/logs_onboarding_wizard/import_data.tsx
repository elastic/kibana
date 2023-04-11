/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSteps,
  EuiHorizontalRule,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';

export function ImportData() {
  const { goToStep, goBack } = useWizard();

  function onContinue() {
    goToStep('inspect');
  }

  function onBack() {
    goBack();
  }

  return (
    <StepPanel title="">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            It might take a few minutes for the data to get to Elasticsearch. If
            you're not seeing any, try generating some to verify. If you're
            having trouble connecting, check out the troubleshooting guide.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut>
          <EuiFlexGroup justifyContent="flexStart" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <p>Listening for incoming logs</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiSteps
          titleSize="xs"
          steps={[
            { title: 'Ping received', status: 'complete', children: null },
            { title: 'File found', status: 'complete', children: null },
            {
              title: 'Downloading Elastic Agent',
              status: 'loading',
              children: null,
            },
            {
              title: 'Starting Elastic Agent',
              status: 'incomplete',
              children: null,
            },
          ]}
        />
        <EuiHorizontalRule margin="l" />
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="help">Need some help?</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButton color="ghost" fill onClick={onBack}>
            Back
          </EuiButton>,
          <EuiButton color="primary" fill onClick={onContinue}>
            Continue
          </EuiButton>,
        ]}
      />
    </StepPanel>
  );
}
