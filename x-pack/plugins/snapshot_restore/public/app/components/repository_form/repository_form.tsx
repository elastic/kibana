/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect, useState } from 'react';

import { PLUGIN_REPOSITORY_TYPES, REPOSITORY_TYPES } from '../../../../common/constants';
import { Repository, RepositoryType } from '../../../../common/types';

import { useAppDependencies } from '../../index';
import { documentationLinksService } from '../../services/documentation';
import { loadRepositoryTypes } from '../../services/http';
import { textService } from '../../services/text';

import { SectionError } from '../section_error';
import { TypeSettings } from './type_settings';

import {
  EuiButton,
  EuiButtonEmpty,
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

interface Props {
  repository: Repository;
  isEditing?: boolean;
  isSaving: boolean;
  errors?: {
    save?: React.ReactNode;
  };
  onSave: (repository: Repository) => void;
  onCancel: () => void;
}

export const RepositoryForm: React.FunctionComponent<Props> = ({
  repository: originalRepository,
  isEditing,
  isSaving,
  errors,
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
    setIsMounted,
  } = loadRepositoryTypes();

  // Set mounted to false when unmounting to avoid in-flight request setting state on unmounted component
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Repository state
  const [repository, setRepository] = useState<Repository>({
    ...originalRepository,
    settings: {
      ...originalRepository.settings,
    },
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
    if (type === REPOSITORY_TYPES.source && !settings.delegate_type) {
      settings.delegate_type = REPOSITORY_TYPES.fs;
    } else if (type !== REPOSITORY_TYPES.source && settings.delegate_type) {
      delete settings.delegate_type;
    }
    setRepository(newRepository);
  };

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
              defaultMessage="Learn more about {pluginsDocLink}."
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
        >
          {repositoryTypesError ? (
            renderLoadingRepositoryTypesError()
          ) : (
            <EuiSelect
              disabled={isEditing}
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
    const typeValue = availableRepositoryTypes.includes(repository.settings.delegate_type)
      ? repository.settings.delegate_type
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
                    delegate_type: e.target.value,
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
      defaultMessage="Learn more about the {repositoryType} repository type."
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
      <TypeSettings repository={repository} updateRepository={updateRepository} />
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
            onClick={() => onSave(repository)}
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

  const renderSaveError = () => {
    if (errors && errors.save) {
      return (
        <Fragment>
          {errors.save}
          <EuiSpacer size="m" />
        </Fragment>
      );
    }
    return null;
  };

  return (
    <EuiForm>
      {renderNameField()}
      {renderTypeField()}
      {renderDelegateTypeField()}
      {renderSettings()}
      {renderSaveError()}
      {renderActions()}
    </EuiForm>
  );
};

RepositoryForm.defaultProps = {
  isEditing: false,
  isSaving: false,
};
