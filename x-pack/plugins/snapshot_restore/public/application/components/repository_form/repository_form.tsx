/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import { EuiForm } from '@elastic/eui';
import { Repository, EmptyRepository } from '../../../../common/types';
import { flatten } from '../../../../common/lib';

import { RepositoryValidation, validateRepository } from '../../services/validation';
import { RepositoryFormStepOne } from './step_one';
import { RepositoryFormStepTwo } from './step_two';

interface Props {
  repository: Repository | EmptyRepository;
  isManagedRepository?: boolean;
  isEditing?: boolean;
  isSaving: boolean;
  saveError?: React.ReactNode;
  clearSaveError: () => void;
  onSave: (repository: Repository | EmptyRepository) => void;
}

export const RepositoryForm: React.FunctionComponent<Props> = ({
  repository: originalRepository,
  isManagedRepository,
  isEditing,
  isSaving,
  saveError,
  clearSaveError,
  onSave,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(isEditing ? 2 : 1);

  // Repository state
  const [repository, setRepository] = useState<Repository | EmptyRepository>({
    ...originalRepository,
    settings: {
      ...originalRepository.settings,
    },
  });

  // Repository validation state
  const [validation, setValidation] = useState<RepositoryValidation>({
    isValid: true,
    errors: {},
  });

  const updateRepository = (updatedFields: any): void => {
    const newRepository = { ...repository, ...updatedFields };
    setRepository(newRepository);
  };

  const saveRepository = () => {
    const newValidation = validateRepository(repository, true);
    const { isValid } = newValidation;
    setValidation(newValidation);
    if (isValid) {
      onSave(repository);
    }
  };

  const goToNextStep = () => {
    const newValidation = validateRepository(repository, false);
    const { isValid } = newValidation;
    setValidation(newValidation);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const goToPreviousStep = () => {
    if (isEditing) {
      return;
    }
    setValidation({
      isValid: true,
      errors: {},
    });
    setCurrentStep(1);
    clearSaveError();
  };

  const hasValidationErrors: boolean = !validation.isValid;
  const validationErrors = Object.entries(flatten(validation.errors)).reduce(
    (acc: string[], [key, value]) => {
      return [...acc, value];
    },
    []
  );

  const renderStepOne = () => (
    <RepositoryFormStepOne
      repository={repository}
      onNext={() => goToNextStep()}
      updateRepository={updateRepository}
      validation={validation}
    />
  );

  const renderStepTwo = () => (
    <RepositoryFormStepTwo
      repository={repository as Repository}
      isManagedRepository={isManagedRepository}
      isEditing={isEditing}
      isSaving={isSaving}
      onSave={saveRepository}
      updateRepository={updateRepository}
      validation={validation}
      saveError={saveError}
      onBack={() => goToPreviousStep()}
    />
  );

  return (
    <EuiForm
      isInvalid={hasValidationErrors}
      error={validationErrors}
      data-test-subj="repositoryForm"
    >
      {currentStep === 1 && !isEditing ? renderStepOne() : renderStepTwo()}
    </EuiForm>
  );
};

RepositoryForm.defaultProps = {
  isEditing: false,
  isSaving: false,
};
