/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { Repository, EmptyRepository } from '../../../../common/types';
import { useAppDependencies } from '../../index';
import { RepositoryValidation } from '../../services/validation';
import { TypeSettings } from './type_settings';

interface Props {
  repository: Repository | EmptyRepository;
  isEditing?: boolean;
  isSaving: boolean;
  onSave: () => void;
  updateRepository: (updatedFields: any) => void;
  validation: RepositoryValidation;
  saveError?: React.ReactNode;
  onBack: () => void;
}

export const RepositoryFormStepTwo: React.FunctionComponent<Props> = ({
  repository,
  isEditing,
  isSaving,
  onSave,
  updateRepository,
  validation,
  saveError,
  onBack,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const hasValidationErrors: boolean = !validation.isValid;

  const renderSettings = () => (
    <Fragment>
      {/* Repository settings title */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.settingsTitle"
                defaultMessage="Settings"
              />
            </h2>
          </EuiTitle>
        }
        fullWidth
      >
        <Fragment /> {/* Avoid missing children warning */}
      </EuiDescribedFormGroup>

      {/* Repository settings fields */}
      <TypeSettings
        repository={repository}
        updateRepository={updateRepository}
        settingErrors={
          hasValidationErrors && validation.errors.settings ? validation.errors.settings : {}
        }
      />
    </Fragment>
  );

  const renderActions = () => {
    const saveLabel = isEditing ? (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.saveButtonLabel"
        defaultMessage="Save"
      />
    ) : (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.registerButtonLabel"
        defaultMessage="Register"
      />
    );
    const savingLabel = (
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.savingButtonLabel"
        defaultMessage="Saving..."
      />
    );

    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {isEditing ? null : (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              iconType="arrowLeft"
              onClick={onBack}
              data-test-subj="srRepositoryFormSubmitButton"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            color="secondary"
            iconType="check"
            onClick={onSave}
            fill
            data-test-subj="srRepositoryFormSubmitButton"
            isLoading={isSaving}
          >
            {isSaving ? savingLabel : saveLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const renderFormValidationError = () => {
    if (!hasValidationErrors) {
      return null;
    }
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.validationErrorTitle"
              defaultMessage="Fix errors before continuing."
            />
          }
          color="danger"
          iconType="cross"
          data-test-subj="repositoryFormError"
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  const renderSaveError = () => {
    if (!saveError) {
      return null;
    }
    return (
      <Fragment>
        {saveError}
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  return (
    <Fragment>
      {renderSettings()}
      {renderFormValidationError()}
      {renderSaveError()}
      {renderActions()}
    </Fragment>
  );
};
