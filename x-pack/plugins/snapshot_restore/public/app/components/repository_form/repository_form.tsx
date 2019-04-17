/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { PLUGIN_REPOSITORY_TYPES, REPOSITORY_TYPES } from '../../../../common/constants';
import { Repository, RepositoryType } from '../../../../common/types';
import { flatten } from '../../../../common/lib';

import { useAppDependencies } from '../../index';
import { documentationLinksService } from '../../services/documentation';
import { loadRepositoryTypes } from '../../services/http';
import { textService } from '../../services/text';
import { RepositoryValidation, validateRepository } from '../../services/validation';

import { SectionError } from '../section_error';
import { TypeSettings } from './type_settings';

interface Props {
  repository: Repository;
  isEditing?: boolean;
  isSaving: boolean;
  saveError?: React.ReactNode;
  onSave: (repository: Repository) => void;
  onCancel: () => void;
}

export const RepositoryForm: React.FunctionComponent<Props> = ({
  repository: originalRepository,
  isEditing,
  isSaving,
  saveError,
  onSave,
  onCancel,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  // Load repository types
  const {
    error: repositoryTypesError,
    loading: repositoryTypesLoading,
    data: repositoryTypes,
  } = loadRepositoryTypes();

  // Repository state
  const [repository, setRepository] = useState<Repository>({
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

  // Repository types state and load types
  // If existing repository's plugin is no longer installed, let's add it to the list of options for warning UX
  const [availableRepositoryTypes, setAvailableRepositoryTypes] = useState<RepositoryType[]>([]);
  useEffect(
    () => {
      const repositoryTypeOptions = [...repositoryTypes];
      const { type } = repository;
      if (isEditing && PLUGIN_REPOSITORY_TYPES.includes(type) && !repositoryTypes.includes(type)) {
        repositoryTypeOptions.push(type);
      }
      setAvailableRepositoryTypes(repositoryTypeOptions);
    },
    [repositoryTypes]
  );

  const updateRepository = (updatedFields: Partial<Repository>): void => {
    const newRepository: Repository = { ...repository, ...updatedFields };
    const { type, settings } = newRepository;
    if (type === REPOSITORY_TYPES.source && !settings.delegateType) {
      settings.delegateType = REPOSITORY_TYPES.fs;
    } else if (type !== REPOSITORY_TYPES.source && settings.delegateType) {
      delete settings.delegateType;
    }
    setRepository(newRepository);
  };

  const saveRepository = () => {
    const newValidation = validateRepository(repository);
    const { isValid } = newValidation;
    setValidation(newValidation);
    if (isValid) {
      onSave(repository);
    }
  };

  const hasValidationErrors: boolean = !validation.isValid;
  const validationErrors = Object.entries(flatten(validation.errors)).reduce(
    (acc: string[], [key, value]) => {
      return [...acc, value];
    },
    []
  );

  const renderNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.nameDescriptionTitle"
              defaultMessage="Repository name"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.fields.nameDescription"
          defaultMessage="A unique name for the repository."
        />
      }
      idAria="repositoryNameDescription"
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.nameLabel"
            defaultMessage="Name"
          />
        }
        describedByIds={['repositoryNameDescription']}
        isInvalid={Boolean(hasValidationErrors && validation.errors.name)}
        error={validation.errors.name}
        fullWidth
      >
        <EuiFieldText
          readOnly={isEditing}
          defaultValue={repository.name}
          fullWidth
          onChange={e => {
            updateRepository({
              name: e.target.value,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderLoadingRepositoryTypesError = () => (
    <SectionError
      title={
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.errorLoadingRepositoryTypesTitle"
          defaultMessage="Error loading repository types"
        />
      }
      error={repositoryTypesError}
    />
  );

  const renderTypeField = () => {
    const typeValue = availableRepositoryTypes.includes(repository.type)
      ? repository.type
      : REPOSITORY_TYPES.fs;

    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.typeDescriptionTitle"
                defaultMessage="Repository type"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.typeDescription"
              defaultMessage="Repository storage type. Elasticsearch supports a few types by default, additional repository types require plugins."
            />
            <EuiSpacer size="m" />
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.typePluginsLearnMore"
              defaultMessage="Learn more about {pluginsDocLink}"
              values={{
                pluginsDocLink: (
                  <EuiLink
                    href={documentationLinksService.getRepositoryPluginDocUrl()}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.repositoryForm.fields.typePluginsLearnMoreLink"
                      defaultMessage="Snapshot and Restore repository plugins"
                    />
                  </EuiLink>
                ),
              }}
            />
          </Fragment>
        }
        idAria="repositoryTypeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.typeLabel"
              defaultMessage="Type"
            />
          }
          describedByIds={['repositoryTypeDescription']}
          fullWidth
          helpText={renderTypeHelp(typeValue)}
          isInvalid={Boolean(hasValidationErrors && validation.errors.type)}
          error={validation.errors.type}
        >
          {repositoryTypesError ? (
            renderLoadingRepositoryTypesError()
          ) : isEditing ? (
            // Show a text field instead of a select to improve readability by removing the
            // caret and other unnecessary visual noise.
            <EuiFieldText readOnly={true} value={repository.type} fullWidth />
          ) : (
            <EuiSelect
              isLoading={repositoryTypesLoading}
              options={availableRepositoryTypes.map(type => {
                return {
                  value: type,
                  text: textService.getRepositoryTypeName(type),
                };
              })}
              value={typeValue}
              onChange={e => {
                updateRepository({
                  type: e.target.value,
                  settings: {},
                });
              }}
              fullWidth
            />
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  const renderDelegateTypeField = () => {
    if (repository.type !== REPOSITORY_TYPES.source) {
      return null;
    }
    const typeValue = availableRepositoryTypes.includes(repository.settings.delegateType)
      ? repository.settings.delegateType
      : REPOSITORY_TYPES.fs;

    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.delegateTypeDescriptionTitle"
                defaultMessage="Delegate type"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.delegateTypeDescription"
            defaultMessage="Delegate storage type."
          />
        }
        idAria="repositoryDelegateTypeDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.delegateTypeLabel"
              defaultMessage="Delegate type"
            />
          }
          describedByIds={['repositoryDelegateTypeDescription']}
          fullWidth
          helpText={renderTypeHelp(typeValue)}
          isInvalid={Boolean(
            hasValidationErrors &&
              validation.errors.settings &&
              validation.errors.settings.delegateType
          )}
          error={validation.errors.settings && validation.errors.settings.delegateType}
        >
          {repositoryTypesError ? (
            renderLoadingRepositoryTypesError()
          ) : (
            <EuiSelect
              isLoading={repositoryTypesLoading}
              options={availableRepositoryTypes
                .filter(type => type !== REPOSITORY_TYPES.source)
                .map(type => {
                  return {
                    value: type,
                    text: textService.getRepositoryTypeName(type),
                  };
                })}
              value={typeValue}
              onChange={e => {
                updateRepository({
                  settings: {
                    delegateType: e.target.value,
                  },
                });
              }}
              fullWidth
            />
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  const renderTypeHelp = (repositoryType: RepositoryType) => (
    <FormattedMessage
      id="xpack.snapshotRestore.repositoryForm.fields.typeHelpText"
      defaultMessage="Learn more about the {repositoryType} repository type"
      values={{
        repositoryType: (
          <EuiLink
            href={documentationLinksService.getRepositoryTypeDocUrl(repositoryType)}
            target="_blank"
          >
            {textService.getRepositoryTypeName(repositoryType)}
          </EuiLink>
        ),
      }}
    />
  );

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
    const buttonLabel = isEditing ? (
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
        <EuiFlexItem grow={false}>
          <EuiButton
            color="secondary"
            iconType="check"
            onClick={saveRepository}
            fill
            data-test-subj="srRepositoryFormSubmitButton"
            isLoading={isSaving}
          >
            {isSaving ? savingLabel : buttonLabel}
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="primary"
            onClick={() => onCancel()}
            data-test-subj="srRepositoryFormCancelButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
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
    <EuiForm isInvalid={hasValidationErrors} error={validationErrors}>
      {renderNameField()}
      {renderTypeField()}
      {renderDelegateTypeField()}
      {renderSettings()}
      {renderFormValidationError()}
      {renderSaveError()}
      {renderActions()}
    </EuiForm>
  );
};

RepositoryForm.defaultProps = {
  isEditing: false,
  isSaving: false,
};
