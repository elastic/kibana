/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { Repository } from '../../../../common/types';

import { RepositoryForm, SectionError } from '../../components';
import { BASE_PATH, Section } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService } from '../../services/navigation';
import { addRepository } from '../../services/http';

export const RepositoryAdd: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const section = 'repositories' as Section;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<any>({});

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('repositoryAdd');
  }, []);

  const onSave = async (newRepository: Repository) => {
    setIsSaving(true);
    setErrors({ ...errors, save: null });
    const { name } = newRepository;
    const { error } = await addRepository(newRepository);
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

  const emptyRepository = {
    name: '',
    type: REPOSITORY_TYPES.fs,
    settings: {},
  };

  const renderSaveError = () => {
    return errors.save ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addRepository.errorSavingRepositoryTitle"
            defaultMessage="Error registering new repository"
          />
        }
        error={errors.save}
      />
    ) : null;
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
          saveError={renderSaveError()}
          onSave={onSave}
          onCancel={onCancel}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
