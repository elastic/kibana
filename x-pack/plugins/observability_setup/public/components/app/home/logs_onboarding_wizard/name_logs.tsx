import React, { useState } from 'react';
import {
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { useWizard } from '.';

export function NameLogs() {
  const { goToStep, getState, setState } = useWizard();
  const wizardState = getState();
  const [datasetName, setDatasetName] = useState(wizardState.datasetName);

  function onContinue() {
    setState({ ...getState(), datasetName });
    goToStep('configureLogs');
  }

  return (
    <StepPanel title="Give your logs a name">
      <StepPanelContent>
        <EuiText color="subdued">
          <p>Pick a name for your logs, this will become your dataset name.</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm>
          <EuiFormRow
            label="Name"
            helpText="Special characters and space are not allowed."
          >
            <EuiFieldText
              placeholder="Dataset name"
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </StepPanelContent>
      <StepPanelFooter
        items={[
          <EuiButtonEmpty href="/app/observability/overview">
            Skip for now
          </EuiButtonEmpty>,
          <EuiButton
            color="primary"
            fill
            onClick={onContinue}
            isDisabled={!datasetName}
          >
            Save and Continue
          </EuiButton>,
        ]}
      ></StepPanelFooter>
    </StepPanel>
  );
}
