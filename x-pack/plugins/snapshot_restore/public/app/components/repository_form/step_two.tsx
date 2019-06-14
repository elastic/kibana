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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { Repository } from '../../../../common/types';
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { useAppDependencies } from '../../index';
import { RepositoryValidation } from '../../services/validation';
import { documentationLinksService } from '../../services/documentation';
import { TypeSettings } from './type_settings';
import { textService } from '../../services/text';

interface Props {
  repository: Repository;
  isManagedRepository?: boolean;
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
  isManagedRepository,
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
  const {
    name,
    type,
    settings: { delegateType },
  } = repository;
  const typeForDocs = type === REPOSITORY_TYPES.source ? delegateType : type;

  const renderSettings = () => (
    <Fragment>
      {/* Repository settings title */}
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2 data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.settingsTitle"
                defaultMessage="{repositoryName} settings"
                values={{
                  repositoryName: `'${name}'`,
                }}
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getRepositoryTypeDocUrl(typeForDocs)}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.repositoryTypeDocLink"
              defaultMessage="{repositoryType} repository docs"
              values={{
                repositoryType: textService.getRepositoryTypeName(typeForDocs),
              }}
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

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
        defaultMessage="Saving…"
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
              data-test-subj="backButton"
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
            color={isManagedRepository ? 'warning' : 'secondary'}
            iconType="check"
            onClick={onSave}
            fill={isManagedRepository ? false : true}
            data-test-subj="submitButton"
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
    <div data-test-subj="stepTwo">
      {renderSettings()}
      {renderFormValidationError()}
      {renderSaveError()}
      {renderActions()}
    </div>
  );
};
