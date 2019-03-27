/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { API_BASE_PATH, REPOSITORY_TYPES } from '../../../../common/constants';
import { Repository } from '../../../../common/types';

import { RepositoryForm, SectionError } from '../../components';
import { BASE_PATH, getHomeBreadcrumb, getRepositoryAddBreadcrumb, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { sendRequest } from '../../services/http';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: { i18n, http, chrome },
    plugins: { management },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const section = 'repositories' as Section;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<null | any>(null);

  // Set breadcrumb
  useEffect(() => {
    chrome.breadcrumbs.set([
      management.constants.BREADCRUMB,
      getHomeBreadcrumb(i18n.translate),
      getRepositoryAddBreadcrumb(i18n.translate),
    ]);
  }, []);

  const onSave = async (newRepository: Repository) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newRepository;
    const { error } = await sendRequest({
      path: chrome.addBasePath(`${API_BASE_PATH}repositories`),
      method: 'put',
      body: newRepository,
      httpClient: http.getClient(),
    });
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(`${BASE_PATH}/${section}/${name}`);
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/${section}`);
  };

  const emptyRepository = {
    name: '',
    type: REPOSITORY_TYPES.fs,
    settings: {},
  };

  const renderSaveError = () => {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.errorSavingRepositoryTitle"
            defaultMessage="Error registering new repository"
          />
        }
        error={saveError}
      />
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.addRepository.title"
              defaultMessage="Register repository"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <RepositoryForm
          repository={emptyRepository}
          isSaving={isSaving}
          saveError={saveError ? renderSaveError() : null}
          onSave={onSave}
          onCancel={onCancel}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
