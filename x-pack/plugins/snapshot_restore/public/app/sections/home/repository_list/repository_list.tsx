/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { Repository } from '../../../../../common/types';
import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { loadRepositories } from '../../../services/http';

import { RepositoryDetails } from './repository_details';
import { RepositoryTable } from './repository_table';

interface MatchParams {
  repositoryName?: Repository['name'];
}

export const RepositoryList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName },
  },
  history,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    error,
    loading,
    data: { repositories, verification } = { repositories: undefined, verification: undefined },
    request: reload,
  } = loadRepositories();

  const openRepositoryDetails = (newRepositoryName: Repository['name']) => {
    history.push(`${BASE_PATH}/repositories/${newRepositoryName}`);
  };

  const closeRepositoryDetails = () => {
    history.push(`${BASE_PATH}/repositories`);
  };

  const onRepositoryDeleted = (repositoriesDeleted: Array<Repository['name']>): void => {
    if (repositoryName && repositoriesDeleted.includes(repositoryName)) {
      closeRepositoryDetails();
    }
    if (repositoriesDeleted.length) {
      reload();
    }
  };

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.loadingRepositories"
          defaultMessage="Loading repositories…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
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
  } else if (repositories && repositories.length === 0) {
    content = (
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
            href={history.createHref({
              pathname: `${BASE_PATH}/add_repository`,
            })}
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
  } else {
    content = (
      <RepositoryTable
        repositories={repositories || []}
        verification={verification || {}}
        reload={reload}
        openRepositoryDetails={openRepositoryDetails}
        onRepositoryDeleted={onRepositoryDeleted}
      />
    );
  }

  return (
    <Fragment>
      {repositoryName ? (
        <RepositoryDetails
          repositoryName={repositoryName}
          onClose={closeRepositoryDetails}
          onRepositoryDeleted={onRepositoryDeleted}
        />
      ) : null}
      {content}
    </Fragment>
  );
};
