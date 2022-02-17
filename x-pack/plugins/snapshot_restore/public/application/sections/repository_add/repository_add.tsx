/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageContentBody, EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { Repository, EmptyRepository } from '../../../../common/types';

import { SectionError } from '../../../shared_imports';

import { RepositoryForm } from '../../components';
import { BASE_PATH, Section } from '../../constants';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { addRepository } from '../../services/http';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { search },
}) => {
  const section = 'repositories' as Section;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryAdd');
    docTitleService.setTitle('repositoryAdd');
  }, []);

  const onSave = async (newRepository: Repository | EmptyRepository) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newRepository;
    const { error } = await addRepository(newRepository);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      const { redirect } = parse(search.replace(/^\?/, ''), { sort: false });

      history.push(
        redirect
          ? (redirect as string)
          : encodeURI(`${BASE_PATH}/${encodeURIComponent(section)}/${encodeURIComponent(name)}`)
      );
    }
  };

  const emptyRepository = {
    name: '',
    type: null,
    settings: {},
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.savingRepositoryErrorTitle"
            defaultMessage="Cannot register new repository"
          />
        }
        error={saveError}
        data-test-subj="saveRepositoryApiError"
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.addRepositoryTitle"
              defaultMessage="Register repository"
            />
          </span>
        }
      />

      <EuiSpacer size="l" />

      <RepositoryForm
        repository={emptyRepository}
        isSaving={isSaving}
        saveError={renderSaveError()}
        clearSaveError={clearSaveError}
        onSave={onSave}
      />
    </EuiPageContentBody>
  );
};
