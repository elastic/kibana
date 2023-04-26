/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';

export function ConfigureLogs() {
  const { goToStep, goBack, getState, setState } = useWizard();
  const wizardState = getState();
  const [datasetName, setDatasetName] = useState(wizardState.datasetName);

  function onBack() {
    goBack();
  }

  function onContinue() {
    setState({ ...getState(), datasetName });
    goToStep('installElasticAgent');
  }

  return (
    <StepPanel title="Stream log files to Elastic">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>Ingest arbitrary log files and manipulate their content/lines.</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm>
          <EuiDescribedFormGroup
            fullWidth
            title={<h2>Log Paths</h2>}
            description={<>Fill the paths to the log files on your hosts.</>}
          >
            <EuiFormRow
              label="Log file path"
              helpText="You can use a log file path or a log pattern."
            >
              <EuiFieldText placeholder="Example: /var/log/application.*" />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <div style={{ textAlign: 'left' }}>
              <EuiButtonEmpty iconType="plusInCircle">Add row</EuiButtonEmpty>
              <EuiHorizontalRule margin="s" />
              <EuiButtonEmpty iconType="gear" size="xs">
                Advanced settings
              </EuiButtonEmpty>
            </div>
          </EuiDescribedFormGroup>
        </EuiForm>
        <EuiHorizontalRule margin="l" />
        <EuiForm>
          <EuiDescribedFormGroup
            fullWidth
            title={<h2>Give your logs a name</h2>}
            description={
              <>
                Pick a name for your logs, this will become your dataset name.
              </>
            }
          >
            <EuiFormRow
              label="Dataset name"
              helpText="All lowercase, max 100 chars, special characters will be replaced with '_'."
            >
              <EuiFieldText
                placeholder="Dataset name"
                value={datasetName}
                onChange={(event) => setDatasetName(event.target.value)}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButton color="ghost" fill onClick={onBack}>
            Back
          </EuiButton>,
          <EuiButton
            color="primary"
            fill
            onClick={onContinue}
            isDisabled={!datasetName}
          >
            Save and Continue
          </EuiButton>,
        ]}
      />
    </StepPanel>
  );
}
