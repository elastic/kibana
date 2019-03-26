/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { REPOSITORY_PLUGINS_MAP } from '../../../../common/constants';
import { Repository, RepositoryType } from '../../../../common/types';
import { useAppDependencies } from '../../index';
import { useRequest } from '../../services/http';
import { RepositoryTypeName } from '../repository_type_name';
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
  // @ts-ignore
  EuiSuperSelect,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  repository: Repository;
  isEditing?: boolean;
  onSave: (repository: Repository) => void;
  onCancel: () => void;
}

export const RepositoryForm: React.FunctionComponent<Props> = ({
  repository: originalRepository,
  isEditing,
  onSave,
  onCancel,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const { error, loading, data } = useRequest({
    path: `repository_types`,
    method: 'get',
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
      const repositoryTypeOptions = [...data];
      const { type } = repository;
      if (isEditing && REPOSITORY_PLUGINS_MAP[type] && !data.includes(type)) {
        repositoryTypeOptions.push(type);
      }
      setAvailableRepositoryTypes(repositoryTypeOptions);
    },
    [data]
  );

  const onRepositoryChange = (newRepository: Repository): void => {
    setRepository(newRepository);
  };

  return (
    <EuiForm>
      {/* Repository name field */}
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

      {/* Repository type field */}
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
          <EuiSelect
            hasNoInitialSelection={true}
            disabled={isEditing}
            isLoading={loading}
            options={availableRepositoryTypes.map(type => {
              return {
                value: type,
                text: ReactDOMServer.renderToString(<RepositoryTypeName type={type} />),
              };
            })}
            value={availableRepositoryTypes.includes(repository.type) ? repository.type : undefined}
            onChange={e => {
              onRepositoryChange({
                ...repository,
                type: e.target.value,
              });
            }}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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

      {/* Form actions */}
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="secondary"
            iconType="check"
            onClick={() => onSave(repository)}
            fill
            data-test-subj="srRepositoryFormSubmitButton"
          >
            {isEditing ? (
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.saveButtonLabel"
                defaultMessage="Save"
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.registerButtonLabel"
                defaultMessage="Register"
              />
            )}
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
    </EuiForm>
  );
};

RepositoryForm.defaultProps = {
  isEditing: false,
};
