/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { API_BASE_PATH, REPOSITORY_TYPES } from '../../../../common/constants';
import { Repository } from '../../../../common/types';

import { RepositoryForm, SectionError, SectionLoading } from '../../components';
import { BASE_PATH, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService } from '../../services/breadcrumb';
import { sendRequest } from '../../services/http';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

interface MatchParams {
  name: string;
}

interface Props extends RouteComponentProps<MatchParams> {}

export const RepositoryEdit: React.FunctionComponent<Props> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const {
    core: { i18n, chrome, http },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const section = 'repositories' as Section;

  // Load repository information states
  const [loadingRepository, setLoadingRepository] = useState<boolean>(true);
  const [repositoryError, setRepositoryError] = useState<null | any>(null);
  const [repository, setRepository] = useState<Repository>({
    name: '',
    type: REPOSITORY_TYPES.fs,
    settings: {},
  });

  // Saving repository states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<any>({});

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryEdit');
  }, []);

  // Load repository information
  useEffect(() => {
    sendRequest({
      path: chrome.addBasePath(`${API_BASE_PATH}repositories/${encodeURIComponent(name)}`),
      method: 'get',
      httpClient: http.getClient(),
    }).then(({ data, error }) => {
      if (error) {
        setRepositoryError(error);
      } else {
        setRepository(data.repository);
      }
      setLoadingRepository(false);
    });
  }, []);

  // Save repository
  const onSave = async (editedRepository: Repository) => {
    setIsSaving(true);
    setErrors({ ...errors, save: null });
    const { error } = await sendRequest({
      path: chrome.addBasePath(`${API_BASE_PATH}repositories/${encodeURIComponent(name)}`),
      method: 'put',
      body: editedRepository,
      httpClient: http.getClient(),
    });
    setIsSaving(false);
    if (error) {
      setErrors({ ...errors, save: error });
    } else {
      history.push(`${BASE_PATH}/${section}/${name}`);
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/${section}`);
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editRepository.loadingRepository"
          defaultMessage="Loading repository details..."
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = repositoryError.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate('xpack.snapshotRestore.editRepository.errorRepositoryNotFound', {
              defaultMessage: `The repository '{name}' does not exist.`,
              values: {
                name,
              },
            }),
          },
        }
      : repositoryError;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.errorLoadingRepositoryTitle"
            defaultMessage="Error loading repository details"
          />
        }
        error={errorObject}
      />
    );
  };

  const renderSaveError = () => {
    return errors.save ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editRepository.errorSavingRepositoryTitle"
            defaultMessage="Error saving repository details"
          />
        }
        error={errors.save}
      />
    ) : null;
  };

  const renderContent = () => {
    if (loadingRepository) {
      return renderLoading();
    }
    if (repositoryError) {
      return renderError();
    }

    return (
      <RepositoryForm
        repository={repository}
        isEditing={true}
        isSaving={isSaving}
        errors={{
          save: renderSaveError(),
        }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.editRepository.title"
              defaultMessage="Edit repository '{name}'"
              values={{
                name,
              }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {renderContent()}
      </EuiPageContent>
    </EuiPageBody>
  );
};
