/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiStepStatus,
} from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { AuthStep, CreateStep, GetStep, UpdateStep } from './steps';

export const HTTP_VERBS = ['post', 'put', 'patch'];
const fields = {
  step1: [
    'config.hasAuth',
    'secrets.user',
    'secrets.password',
    '__internal__.hasHeaders',
    'config.headers',
  ],
  step2: [
    'config.createIncidentMethod',
    'config.createIncidentUrl',
    'config.createIncidentJson',
    'config.createIncidentResponseKey',
  ],
  step3: [
    'config.getIncidentUrl',
    'config.getIncidentResponseExternalTitleKey',
    'config.getIncidentResponseCreatedDateKey',
    'config.getIncidentResponseUpdatedDateKey',
    'config.incidentViewUrl',
  ],
  step4: [
    'config.updateIncidentMethod',
    'config.updateIncidentUrl',
    'config.updateIncidentJson',
    'config.createCommentMethod',
    'config.createCommentUrl',
    'config.createCommentJson',
  ],
};
type PossibleStepNumbers = 1 | 2 | 3 | 4;
const CasesWebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { isValid, validateFields } = useFormContext();
  const [currentStep, setCurrentStep] = useState<PossibleStepNumbers>(1);
  const [stati, setStati] = useState<Record<string, EuiStepStatus>>({
    step1: 'incomplete',
    step2: 'incomplete',
    step3: 'incomplete',
    step4: 'incomplete',
  });
  const updateStatus = useCallback(async () => {
    const steps: PossibleStepNumbers[] = [1, 2, 3, 4];
    const statuses = await Promise.all(
      steps.map(async (index) => {
        if (typeof isValid !== 'undefined' && !isValid) {
          const { areFieldsValid } = await validateFields(fields[`step${index}`]);
          return {
            [`step${index}`]: areFieldsValid ? 'complete' : ('danger' as EuiStepStatus),
          };
        }
        return {
          [`step${index}`]:
            currentStep === index
              ? 'current'
              : currentStep > index
              ? 'complete'
              : ('incomplete' as EuiStepStatus),
        };
      })
    );
    setStati(statuses.reduce((acc: Record<string, EuiStepStatus>, i) => ({ ...acc, ...i }), {}));
  }, [currentStep, isValid, validateFields]);

  useEffect(() => {
    updateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, currentStep]);

  const [hasConfigurationErrors, setHasConfigurationError] = useState(false);

  const onNextStep = useCallback(
    async (selectedStep?: PossibleStepNumbers) => {
      const nextStep =
        selectedStep != null
          ? selectedStep
          : currentStep === 4
          ? currentStep
          : ((currentStep + 1) as PossibleStepNumbers);
      setHasConfigurationError(false);
      const fieldsToValidate: string[] =
        nextStep === 2
          ? fields.step1
          : nextStep === 3
          ? [...fields.step1, ...fields.step2]
          : nextStep === 4
          ? [...fields.step1, ...fields.step2, ...fields.step3]
          : [];
      const { areFieldsValid } = await validateFields(fieldsToValidate);

      if (!areFieldsValid) {
        setHasConfigurationError(true);
        return;
      }
      if (nextStep < 5) {
        setCurrentStep(nextStep);
      }
    },
    [currentStep, validateFields]
  );

  const horizontalSteps = useMemo(() => {
    return [
      {
        title: i18n.STEP_1,
        status: stati.step1,
        onClick: () => setCurrentStep(1),
      },
      {
        title: i18n.STEP_2,
        status: stati.step2,
        onClick: () => onNextStep(2),
      },
      {
        title: i18n.STEP_3,
        status: stati.step3,
        onClick: () => onNextStep(3),
      },
      {
        title: i18n.STEP_4,
        status: stati.step4,
        onClick: () => onNextStep(4),
      },
    ];
  }, [onNextStep, stati]);

  return (
    <>
      <EuiStepsHorizontal steps={horizontalSteps} />
      {hasConfigurationErrors && <p>{'hasConfigurationErrors!!!!!'}</p>}
      <EuiSpacer size="l" />
      <AuthStep readOnly={readOnly} display={currentStep === 1} />
      <CreateStep readOnly={readOnly} display={currentStep === 2} />
      <GetStep readOnly={readOnly} display={currentStep === 3} />
      <UpdateStep readOnly={readOnly} display={currentStep === 4} />

      <EuiFlexGroup alignItems="flexStart" justifyContent="flexStart" direction="rowReverse">
        {currentStep < 4 && (
          <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
            <EuiButton
              data-test-subj="casesWebhookNext"
              fill
              iconSide="right"
              iconType="arrowRight"
              onClick={() => onNextStep()}
            >
              {i18n.NEXT}
            </EuiButton>
          </EuiFlexItem>
        )}
        {currentStep > 1 && (
          <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
            <EuiButton
              data-test-subj="casesWebhookBack"
              iconSide="left"
              iconType="arrowLeft"
              onClick={() => onNextStep((currentStep - 1) as PossibleStepNumbers)}
            >
              {i18n.PREVIOUS}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesWebhookActionConnectorFields as default };
