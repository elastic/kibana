/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus, EuiCallOut, EuiSpacer } from '@elastic/eui';

import { useAppContext } from '../../app_context';
import { ConfigurationStep, FieldSelectionStep, CreateStep } from './steps';
import { useCreatePolicyContext } from './create_policy_context';
import { createEnrichPolicy } from '../../services/api';
import type { Error } from '../../../shared_imports';
import type { SerializedEnrichPolicy } from '../../../../common';

const CONFIGURATION = 1;
const FIELD_SELECTION = 2;
const CREATE = 3;

export const CreatePolicyWizard = () => {
  const { history } = useAppContext();
  const { draft, completionState } = useCreatePolicyContext();
  const [currentStep, setCurrentStep] = useState(CONFIGURATION);
  const [isLoading, setIsLoading] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);

  const getStepStatus = useCallback(
    (forStep: number): EuiStepStatus => {
      if (currentStep === forStep) {
        return 'current';
      }

      return 'incomplete';
    },
    [currentStep]
  );

  const onSubmit = useCallback(async () => {
    setIsLoading(true);
    const { error } = await createEnrichPolicy(draft as SerializedEnrichPolicy);
    setIsLoading(false);

    // If there was an error while creating the policy, navigate back to the first step and show the error there
    if (error) {
      setCreateError(error);
      return;
    }

    history.push('/enrich_policies');
  }, [draft, history, setIsLoading, setCreateError]);

  const changeCurrentStepTo = useCallback(
    (step: number) => {
      setCurrentStep(step);
      setCreateError(null);
    },
    [setCurrentStep, setCreateError]
  );

  const stepDefinitions = useMemo(
    () => [
      {
        step: CONFIGURATION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
          defaultMessage: 'Configuration',
        }),
        status: completionState.configurationStep ? 'complete' : getStepStatus(CONFIGURATION),
        onClick: () => currentStep !== CONFIGURATION && changeCurrentStepTo(CONFIGURATION),
        children: currentStep === CONFIGURATION && (
          <ConfigurationStep onNext={() => changeCurrentStepTo(FIELD_SELECTION)} />
        ),
      },
      {
        step: FIELD_SELECTION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
          defaultMessage: 'Field selection',
        }),
        status: completionState.fieldsSelectionStep ? 'complete' : getStepStatus(FIELD_SELECTION),
        onClick: () => {
          if (currentStep !== FIELD_SELECTION && completionState.configurationStep) {
            changeCurrentStepTo(FIELD_SELECTION);
          }
        },
        children: currentStep === FIELD_SELECTION && (
          <FieldSelectionStep onNext={() => changeCurrentStepTo(CREATE)} />
        ),
      },
      {
        step: CREATE,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.setupTrustLabel', {
          defaultMessage: 'Create',
        }),
        status: (currentStep === CREATE ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (
            currentStep !== CREATE &&
            completionState.configurationStep &&
            completionState.fieldsSelectionStep
          ) {
            changeCurrentStepTo(CREATE);
          }
        },
        children: currentStep === CREATE && (
          <CreateStep onSubmit={onSubmit} isLoading={isLoading} />
        ),
      },
    ],
    [currentStep, changeCurrentStepTo, completionState, getStepStatus, isLoading, onSubmit]
  );

  return (
    <>
      {createError && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.idxMgmt.editSettingsJSON.saveJSONCalloutErrorTitle', {
              defaultMessage: 'There was an error while trying to create your policy',
            })}
            color="danger"
            iconType="error"
          >
            <p>{createError.message}</p>
          </EuiCallOut>
          <EuiSpacer size="xl" />
        </>
      )}
      <EuiSteps steps={stepDefinitions} />
    </>
  );
};
