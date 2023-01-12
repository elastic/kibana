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
  EuiLink,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiStepStatus,
} from '@elastic/eui';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
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
    'config.viewIncidentUrl',
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
  const { docLinks } = useKibana().services;
  const { isValid, getFields, validateFields } = useFormContext();
  const [currentStep, setCurrentStep] = useState<PossibleStepNumbers>(1);
  const [status, setStatus] = useState<Record<string, EuiStepStatus>>({
    step1: 'incomplete',
    step2: 'incomplete',
    step3: 'incomplete',
    step4: 'incomplete',
  });
  const updateStatus = useCallback(async () => {
    const steps: PossibleStepNumbers[] = [1, 2, 3, 4];
    const currentFields = getFields();
    const statuses = steps.map((index) => {
      if (typeof isValid !== 'undefined' && !isValid) {
        const fieldsToValidate = fields[`step${index}`];
        // submit validation fields have already been through validator
        // so we can look at the isValid property from `getFields()`
        const areFieldsValid = fieldsToValidate.every((field) =>
          currentFields[field] !== undefined ? currentFields[field].isValid : true
        );
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
    });
    setStatus(statuses.reduce((acc: Record<string, EuiStepStatus>, i) => ({ ...acc, ...i }), {}));
  }, [currentStep, getFields, isValid]);

  useEffect(() => {
    updateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, currentStep]);

  const onNextStep = useCallback(
    async (selectedStep?: PossibleStepNumbers) => {
      const nextStep =
        selectedStep != null
          ? selectedStep
          : currentStep === 4
          ? currentStep
          : ((currentStep + 1) as PossibleStepNumbers);
      const fieldsToValidate: string[] =
        nextStep === 2
          ? fields.step1
          : nextStep === 3
          ? [...fields.step1, ...fields.step2]
          : nextStep === 4
          ? [...fields.step1, ...fields.step2, ...fields.step3]
          : [];
      // step validation needs async call in order to run each field through validator
      const { areFieldsValid } = await validateFields(fieldsToValidate);

      if (!areFieldsValid) {
        setStatus((currentStatus) => ({
          ...currentStatus,
          [`step${currentStep}`]: 'danger',
        }));
        return;
      }
      if (nextStep < 5) {
        setCurrentStep(nextStep);
      }
    },
    [currentStep, validateFields]
  );

  const horizontalSteps = useMemo(
    () => [
      {
        title: i18n.STEP_1,
        status: status.step1,
        onClick: () => setCurrentStep(1),
        ['data-test-subj']: `horizontalStep1-${status.step1}`,
      },
      {
        title: i18n.STEP_2,
        status: status.step2,
        onClick: () => onNextStep(2),
        ['data-test-subj']: `horizontalStep2-${status.step2}`,
      },
      {
        title: i18n.STEP_3,
        status: status.step3,
        onClick: () => onNextStep(3),
        ['data-test-subj']: `horizontalStep3-${status.step3}`,
      },
      {
        title: i18n.STEP_4,
        status: status.step4,
        onClick: () => onNextStep(4),
        ['data-test-subj']: `horizontalStep4-${status.step4}`,
      },
    ],
    [onNextStep, status]
  );

  return (
    <>
      <EuiStepsHorizontal steps={horizontalSteps} />
      <EuiLink
        href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/cases-webhook-action-type.html`}
        target="_blank"
      >
        {i18n.DOC_LINK}
      </EuiLink>
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
