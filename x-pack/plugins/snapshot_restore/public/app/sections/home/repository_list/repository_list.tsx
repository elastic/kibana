/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { Repository } from '../../../../../common/types';
import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, Section } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { loadRepositories } from '../../../services/http';

import { RepositoryDetails } from './repository_details';
import { RepositoryTable } from './repository_table';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface MatchParams {
  repositoryName?: Repository['name'];
}
interface Props extends RouteComponentProps<MatchParams> {}

export const RepositoryList: React.FunctionComponent<Props> = ({
  match: {
    params: { repositoryName: name },
  },
  history,
}) => {
  const section = 'repositories' as Section;
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    error,
    loading,
    data: { repositories, verification },
    request: reload,
  } = loadRepositories();
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
          defaultMessage="Loading repositories…"
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

  if (repositories && repositories.length === 0) {
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
  }

  const onRepositoryDeleted = (repositoriesDeleted: Array<Repository['name']>): void => {
    if (currentRepository && repositoriesDeleted.includes(currentRepository)) {
      closeRepositoryDetails();
    }
    if (repositoriesDeleted.length) {
      reload();
    }
  };

  return (
    <Fragment>
      {currentRepository ? (
        <RepositoryDetails
          repositoryName={currentRepository}
          onClose={closeRepositoryDetails}
          onRepositoryDeleted={onRepositoryDeleted}
        />
      ) : null}
      <RepositoryTable
        repositories={repositories || []}
        verification={verification || {}}
        reload={reload}
        openRepositoryDetails={openRepositoryDetails}
        onRepositoryDeleted={onRepositoryDeleted}
      />
    </Fragment>
  );
};
