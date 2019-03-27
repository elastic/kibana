/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { API_BASE_PATH } from '../../../../../common/constants';
import { Repository } from '../../../../../common/types';

import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, Section } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useRequest } from '../../../services/http';

import { RepositoryDetails } from './repository_details';
import { RepositoryTable } from './repository_table';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface MatchParams {
  name?: Repository['name'];
}
interface Props extends RouteComponentProps<MatchParams> {}

export const RepositoryList: React.FunctionComponent<Props> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const section = 'repositories' as Section;
  const {
    core: {
      chrome,
      http,
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const { error, loading, data: repositories, request: reload } = useRequest({
    path: chrome.addBasePath(`${API_BASE_PATH}repositories`),
    method: 'get',
    httpClient: http.getClient(),
  });
  const [currentRepository, setCurrentRepository] = useState<Repository['name'] | undefined>(
    undefined
  );
  const openRepositoryDetails = (repositoryName: Repository['name']) => {
    setCurrentRepository(repositoryName);
    history.push(`${BASE_PATH}/${section}/${repositoryName}`);
  };
  const closeRepositoryDetails = () => {
    setCurrentRepository(undefined);
    history.push(`${BASE_PATH}/${section}`);
  };
  useEffect(
    () => {
      setCurrentRepository(name);
    },
    [name]
  );

  if (loading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.loadingRepositories"
          defaultMessage="Loading repositories..."
        />
      </SectionLoading>
    );
  }

  if (error) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryList.errorLoadingRepositories"
            defaultMessage="Error loading repositories"
          />
        }
        error={error}
      />
    );
  }

  if (repositories.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryList.emptyPromptTitle"
              defaultMessage="Register your first snapshot repository"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryList.emptyPromptDescription"
                defaultMessage="Use snapshot repositories to perform snapshot and restore operations."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            onClick={() => history.push(`${BASE_PATH}/${section}/add`)}
            fill
            iconType="plusInCircle"
            data-test-subj="srRepositoriesEmptyPromptAddButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.addRepositoryButtonLabel"
              defaultMessage="Register a repository"
            />
          </EuiButton>
        }
      />
    );
  }

  return (
    <Fragment>
      {currentRepository ? (
        <RepositoryDetails repositoryName={currentRepository} onClose={closeRepositoryDetails} />
      ) : null}
      <RepositoryTable
        repositories={repositories}
        reload={reload}
        openRepositoryDetails={openRepositoryDetails}
      />
    </Fragment>
  );
};
