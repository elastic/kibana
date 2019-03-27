/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect, useState } from 'react';
import ReactDOMServer from 'react-dom/server';

import {
  API_BASE_PATH,
  REPOSITORY_PLUGINS_MAP,
  REPOSITORY_TYPES,
} from '../../../../common/constants';
import { Repository, RepositoryType } from '../../../../common/types';

import { useAppDependencies } from '../../index';
import { useRequest } from '../../services/http';
import { RepositoryTypeName } from '../repository_type_name';
import { SectionError } from '../section_error';
import { TypeSettings } from './type_settings';

import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  // @ts-ignore
  EuiSuperSelect,
  EuiTitle,
} from '@elastic/eui';

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
      http,
      chrome,
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    error: repositoryTypesError,
    loading: repositoryTypesLoading,
    data: repositoryTypes,
  } = useRequest({
    path: chrome.addBasePath(`${API_BASE_PATH}repository_types`),
    method: 'get',
    httpClient: http.getClient(),
  });

  const [repository, setRepository] = useState<Repository>({
    ...originalRepository,
    settings: {
      ...originalRepository.settings,
    },
  });

  const [availableRepositoryTypes, setAvailableRepositoryTypes] = useState<RepositoryType[]>([]);

  // Get repository type options
  // If existing repository's plugin is no longer installed, let's add it to the list of options for warning UX
  useEffect(
    () => {
      const repositoryTypeOptions = [...repositoryTypes];
      const { type } = repository;
      if (isEditing && REPOSITORY_PLUGINS_MAP[type] && !repositoryTypes.includes(type)) {
        repositoryTypeOptions.push(type);
      }
      setAvailableRepositoryTypes(repositoryTypeOptions);
    },
    [repositoryTypes]
  );

  const onRepositoryChange = (newRepository: Repository): void => {
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
            onRepositoryChange({
              ...repository,
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

  const renderTypeField = () => (
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
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.fields.typeDescription"
          defaultMessage="Repository storage type."
        />
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
                text: ReactDOMServer.renderToString(<RepositoryTypeName type={type} />),
              };
            })}
            value={
              availableRepositoryTypes.includes(repository.type)
                ? repository.type
                : REPOSITORY_TYPES.fs
            }
            onChange={e => {
              onRepositoryChange({
                ...repository,
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

  const renderDelegateTypeField = () => {
    if (repository.type !== REPOSITORY_TYPES.source) {
      return null;
    }
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
                    text: ReactDOMServer.renderToString(<RepositoryTypeName type={type} />),
                  };
                })}
              value={
                availableRepositoryTypes.includes(repository.settings.delegate_type)
                  ? repository.settings.delegate_type
                  : REPOSITORY_TYPES.fs
              }
              onChange={e => {
                onRepositoryChange({
                  ...repository,
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
      <TypeSettings repository={repository} onRepositoryChange={onRepositoryChange} />
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
    if (saveError) {
      return (
        <Fragment>
          {saveError}
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
