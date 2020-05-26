/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useRef, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';

import { serializers } from '../../../shared_imports';
import { TemplateDeserialized, DEFAULT_INDEX_TEMPLATE_VERSION_FORMAT } from '../../../../common';
import { TemplateSteps } from './template_steps';
import { StepAliases, StepLogistics, StepMappings, StepSettings, StepReview } from './steps';
import { StepProps, DataGetterFunc } from './types';
import { SectionError } from '../section_error';

const { stripEmptyFields } = serializers;

interface Props {
  onSave: (template: TemplateDeserialized) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  defaultValue?: TemplateDeserialized;
  isEditing?: boolean;
}

interface ValidationState {
  [key: number]: { isValid: boolean | undefined };
}

const defaultValidation = { isValid: true };

const stepComponentMap: { [key: number]: React.FunctionComponent<StepProps> } = {
  1: StepLogistics,
  2: StepSettings,
  3: StepMappings,
  4: StepAliases,
  5: StepReview,
};

export const TemplateForm: React.FunctionComponent<Props> = ({
  defaultValue = {
    name: '',
    indexPatterns: [],
    template: {},
    isManaged: false,
    _kbnMeta: {
      formatVersion: DEFAULT_INDEX_TEMPLATE_VERSION_FORMAT,
    },
  },
  onSave,
  isSaving,
  saveError,
  clearSaveError,
  isEditing,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [validation, setValidation] = useState<ValidationState>({
    1: defaultValidation,
    2: defaultValidation,
    3: defaultValidation,
    4: defaultValidation,
    5: defaultValidation,
  });

  const template = useRef<TemplateDeserialized>(defaultValue);
  const stepsDataGetters = useRef<Record<number, DataGetterFunc>>({});

  const lastStep = Object.keys(stepComponentMap).length;
  const CurrentStepComponent = stepComponentMap[currentStep];
  const isStepValid = validation[currentStep].isValid;

  const setStepDataGetter = useCallback(
    (stepDataGetter: DataGetterFunc) => {
      stepsDataGetters.current[currentStep] = stepDataGetter;
    },
    [currentStep]
  );

  const onStepValidityChange = useCallback(
    (isValid: boolean | undefined) => {
      setValidation((prev) => ({
        ...prev,
        [currentStep]: {
          isValid,
          errors: {},
        },
      }));
    },
    [currentStep]
  );

  const validateAndGetDataFromCurrentStep = async () => {
    const validateAndGetStepData = stepsDataGetters.current[currentStep];

    if (!validateAndGetStepData) {
      throw new Error(`No data getter has been set for step "${currentStep}"`);
    }

    const { isValid, data, path } = await validateAndGetStepData();

    if (isValid) {
      // Update the template object with the current step data
      if (path) {
        // We only update a "slice" of the template
        const sliceToUpdate = template.current[path as keyof TemplateDeserialized];

        if (sliceToUpdate === null || typeof sliceToUpdate !== 'object') {
          return { isValid, data };
        }

        template.current = {
          ...template.current,
          [path]: { ...sliceToUpdate, ...data },
        };
      } else {
        template.current = { ...template.current, ...data };
      }
    }

    return { isValid, data };
  };

  const updateCurrentStep = async (nextStep: number) => {
    // All steps needs validation, except for the last step
    const shouldValidate = currentStep !== lastStep;

    if (shouldValidate) {
      const isValid =
        isStepValid === false ? false : (await validateAndGetDataFromCurrentStep()).isValid;

      // If step is invalid do not let user proceed
      if (!isValid) {
        return;
      }
    }

    setCurrentStep(nextStep);
    clearSaveError();
  };

  const onBack = () => {
    const prevStep = currentStep - 1;
    updateCurrentStep(prevStep);
  };

  const onNext = () => {
    const nextStep = currentStep + 1;
    updateCurrentStep(nextStep);
  };

  const saveButtonLabel = isEditing ? (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.saveButtonLabel"
      defaultMessage="Save template"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.createButtonLabel"
      defaultMessage="Create template"
    />
  );

  return (
    <Fragment>
      <TemplateSteps
        currentStep={currentStep}
        updateCurrentStep={updateCurrentStep}
        isCurrentStepValid={isStepValid}
      />

      <EuiSpacer size="l" />

      {saveError ? (
        <Fragment>
          <SectionError
            title={
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.saveTemplateError"
                defaultMessage="Unable to create template"
              />
            }
            error={saveError}
            data-test-subj="saveTemplateError"
          />
          <EuiSpacer size="m" />
        </Fragment>
      ) : null}

      <EuiForm data-test-subj="templateForm">
        <CurrentStepComponent
          key={currentStep}
          template={template.current}
          setDataGetter={setStepDataGetter}
          updateCurrentStep={updateCurrentStep}
          onStepValidityChange={onStepValidityChange}
          isEditing={isEditing}
        />
        <EuiSpacer size="l" />

        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              {currentStep > 1 ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="arrowLeft" onClick={onBack} data-test-subj="backButton">
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.backButtonLabel"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}

              {currentStep < lastStep ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="arrowRight"
                    onClick={onNext}
                    iconSide="right"
                    disabled={isStepValid === false}
                    data-test-subj="nextButton"
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.nextButtonLabel"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : null}

              {currentStep === lastStep ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="secondary"
                    iconType="check"
                    onClick={onSave.bind(
                      null,
                      stripEmptyFields(template.current!) as TemplateDeserialized
                    )}
                    data-test-subj="submitButton"
                    isLoading={isSaving}
                  >
                    {isSaving ? (
                      <FormattedMessage
                        id="xpack.idxMgmt.templateForm.savingButtonLabel"
                        defaultMessage="Saving..."
                      />
                    ) : (
                      saveButtonLabel
                    )}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

      <EuiSpacer size="m" />
    </Fragment>
  );
};
