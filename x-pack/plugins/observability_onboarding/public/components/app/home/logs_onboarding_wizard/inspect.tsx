/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiTitle, EuiSpacer } from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';

export function Inspect() {
  const { goBack, getState, getPath, getUsage } = useWizard();
  return (
    <StepPanel title="Inspect wizard">
      <StepPanelContent>
        <EuiTitle size="s">
          <h3>State</h3>
        </EuiTitle>
        <pre>{JSON.stringify(getState(), null, 4)}</pre>
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>Path</h3>
        </EuiTitle>
        <pre>{JSON.stringify(getPath(), null, 4)}</pre>
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>Usage</h3>
        </EuiTitle>
        <pre>{JSON.stringify(getUsage(), null, 4)}</pre>
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButton color="ghost" fill onClick={goBack}>
            Back
          </EuiButton>,
        ]}
      />
    </StepPanel>
  );
}
