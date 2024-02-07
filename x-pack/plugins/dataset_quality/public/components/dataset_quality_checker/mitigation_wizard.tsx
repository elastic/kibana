/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescriptionList,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useActor } from '@xstate/react';
import React, { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { IncreaseIgnoreAboveMitigation, Mitigation, QualityProblemCause } from '../../../common';
import { DetailsPreJson, PreJson } from './json_details';
import {
  DataStreamQualityMitigationStateProvider,
  useDataStreamQualityMitigationStateContext,
} from './mitigation_state_machine_provider';
import { getDataStreamQualityMitigationActor } from './state_machine';
import { useDataStreamQualityChecksStateContext } from './state_machine_provider';
import { StepPanel, Steps } from './step_panel';

export const ConnectedMitigations = React.memo(() => {
  const [checkState] = useActor(useDataStreamQualityChecksStateContext());

  if (checkState.matches('mitigatingProblem')) {
    const mitigationStateService = getDataStreamQualityMitigationActor(checkState);

    if (mitigationStateService == null) {
      return null;
    }

    return (
      <DataStreamQualityMitigationStateProvider mitigationStateService={mitigationStateService}>
        <ConnectedMitigationsContent />
      </DataStreamQualityMitigationStateProvider>
    );
  }

  return null;
});

const ConnectedMitigationsContent = React.memo(() => {
  const [mitigationState] = useActor(useDataStreamQualityMitigationStateContext());

  if (mitigationState.matches('loadingMitigations')) {
    return <EuiLoadingSpinner />;
  } else if (mitigationState.matches('hasMitigations')) {
    return <ConnectedMitigationsList />;
  } else if (mitigationState.matches('configuringMitigation')) {
    return <ConnectedConfiguringMitigationPanel />;
  } else if (mitigationState.matches('applyingMitigation')) {
    return <ConnectedApplyingMitigationPanel />;
  } else if (mitigationState.matches('appliedMitigation')) {
    return <ConnectedAppliedMitigationPanel />;
  }

  return null;
});

const ConnectedMitigationsList = React.memo(() => {
  const [mitigationState, send] = useActor(useDataStreamQualityMitigationStateContext());
  const {
    context: {
      mitigations: causesAndMitigations,
      parameters: { problem },
    },
  } = mitigationState;

  const configureMitigation = useCallback(
    (cause: QualityProblemCause, mitigation: Mitigation) => {
      send({
        type: 'configureMitigation',
        cause,
        mitigation,
      });
    },
    [send]
  );

  return (
    <Steps>
      <StepPanel title={`Problem ${problem.type}`} color="primary">
        <PreJson value={problem} />
      </StepPanel>
      {causesAndMitigations.map(({ cause, mitigations }) => {
        return (
          <StepPanel key={cause.type} title={`Cause ${cause.type}`} color="warning">
            <EuiFlexGroup direction="column" gutterSize="s">
              {cause.type === 'value-too-large' ? (
                <EuiFlexItem>
                  <EuiDescriptionList
                    type="column"
                    listItems={[
                      {
                        title: 'Field',
                        description: cause.field,
                      },
                      {
                        title: 'Current limit',
                        description: cause.limit,
                      },
                      {
                        title: 'Values',
                        description: <PreJson value={cause.values} />,
                      },
                    ]}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>Available mitigations</h2>
                </EuiTitle>
              </EuiFlexItem>
              {mitigations.map((mitigation) => (
                <EuiFlexItem key={mitigation.type}>
                  <EuiFlexGroup direction="row">
                    <EuiFlexItem grow>{mitigation.type}</EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButton
                        color="primary"
                        onClick={() => configureMitigation(cause, mitigation)}
                      >
                        Configure
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
              <EuiFlexItem>
                <DetailsPreJson title="Cause details" value={cause} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </StepPanel>
        );
      })}
    </Steps>
  );
});

const ConnectedConfiguringMitigationPanel = React.memo(() => {
  const [mitigationState, send] = useActor(useDataStreamQualityMitigationStateContext());

  const gotoPrevious = useCallback(() => {
    send({
      type: 'return',
    });
  }, [send]);

  const applyMitigation = useCallback(
    (cause: QualityProblemCause, mitigation: Mitigation) => {
      send({
        type: 'applyMitigation',
        cause,
        mitigation,
      });
    },
    [send]
  );

  const {
    context: { currentMitigation },
  } = mitigationState;

  if (currentMitigation == null) {
    return null;
  }

  return (
    <ConfiguringMitigationPanel
      cause={currentMitigation.cause}
      mitigation={currentMitigation.mitigation}
      onGotoPrevious={gotoPrevious}
      onApplyMitigation={applyMitigation}
    />
  );
});

const ConfiguringMitigationPanel = React.memo(
  ({
    cause,
    mitigation,
    onGotoPrevious,
    onApplyMitigation,
  }: {
    cause: QualityProblemCause;
    mitigation: Mitigation;
    onGotoPrevious: () => void;
    onApplyMitigation: (cause: QualityProblemCause, mitigation: Mitigation) => void;
  }) => {
    return (
      <StepPanel
        onGotoPrevious={onGotoPrevious}
        title={`Mitigation ${mitigation.type}`}
        color="primary"
      >
        {mitigation.type === 'mapping-increase-ignore-above' ? (
          <ConfiguringIncreaseIgnoreAboveMitigationForm
            cause={cause}
            mitigation={mitigation}
            onApplyMitigation={onApplyMitigation}
          />
        ) : null}
        <EuiSpacer />
        <DetailsPreJson title="Cause details" value={cause} />
      </StepPanel>
    );
  }
);

const ConfiguringIncreaseIgnoreAboveMitigationForm = React.memo(
  ({
    cause,
    mitigation,
    onApplyMitigation,
  }: {
    cause: QualityProblemCause;
    mitigation: IncreaseIgnoreAboveMitigation;
    onApplyMitigation: (cause: QualityProblemCause, mitigation: Mitigation) => void;
  }) => {
    const { control, formState, handleSubmit } = useForm({
      defaultValues: {
        limit: `${mitigation.limit}`,
      },
    });

    return (
      <EuiForm
        onSubmit={handleSubmit(({ limit }) => {
          onApplyMitigation(cause, {
            ...mitigation,
            limit: parseInt(limit, 10),
          });
        })}
        component="form"
        isInvalid={!formState.isValid}
      >
        <Controller
          name="limit"
          control={control}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiFormRow
              label="New ignore_above limit"
              isInvalid={fieldState.invalid}
              error={fieldState.error}
            >
              <EuiFieldNumber inputRef={ref} isInvalid={fieldState.invalid} {...field} />
            </EuiFormRow>
          )}
        />
        <EuiButton type="submit">Apply</EuiButton>
      </EuiForm>
    );
  }
);

const ConnectedAppliedMitigationPanel = React.memo(() => {
  const [mitigationState, send] = useActor(useDataStreamQualityMitigationStateContext());

  const finish = useCallback(() => {
    send({
      type: 'finish',
    });
  }, [send]);

  return (
    <StepPanel title="Applied mitigation" color="success">
      <EuiButton color="success" onClick={finish}>
        Finish
      </EuiButton>
    </StepPanel>
  );
});

const ConnectedApplyingMitigationPanel = React.memo(() => {
  return <EuiLoadingSpinner />;
});
