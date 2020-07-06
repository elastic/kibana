/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { parse } from 'query-string';
import { FormattedMessage } from '@kbn/i18n/react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiCallOut, EuiLink, EuiEmptyPrompt, EuiSpacer, EuiIcon } from '@elastic/eui';

import { APP_SLM_CLUSTER_PRIVILEGES } from '../../../../../common';
import { WithPrivileges, SectionError, Error } from '../../../../shared_imports';
import { SectionLoading } from '../../../components';
import { BASE_PATH, UIM_SNAPSHOT_LIST_LOAD } from '../../../constants';
import { documentationLinksService } from '../../../services/documentation';
import { useLoadSnapshots } from '../../../services/http';
import {
  linkToRepositories,
  linkToAddRepository,
  linkToPolicies,
  linkToAddPolicy,
  linkToSnapshot,
} from '../../../services/navigation';
import { useServices } from '../../../app_context';
import { SnapshotDetails } from './snapshot_details';
import { SnapshotTable } from './snapshot_table';

import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';

interface MatchParams {
  repositoryName?: string;
  snapshotId?: string;
}

export const SnapshotList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName, snapshotId },
  },
  location: { search },
  history,
}) => {
  const {
    error,
    isLoading,
    data: { snapshots = [], repositories = [], policies = [], errors = {} },
    sendRequest: reload,
  } = useLoadSnapshots();

  const { uiMetricService } = useServices();

  const openSnapshotDetailsUrl = (
    repositoryNameToOpen: string,
    snapshotIdToOpen: string
  ): string => {
    return linkToSnapshot(repositoryNameToOpen, snapshotIdToOpen);
  };

  const closeSnapshotDetails = () => {
    history.push(`${BASE_PATH}/snapshots`);
  };

  const onSnapshotDeleted = (
    snapshotsDeleted: Array<{ snapshot: string; repository: string }>
  ): void => {
    if (
      repositoryName &&
      snapshotId &&
      snapshotsDeleted.find(
        ({ snapshot, repository }) => snapshot === snapshotId && repository === repositoryName
      )
    ) {
      closeSnapshotDetails();
    }
    if (snapshotsDeleted.length) {
      reload();
    }
  };

  // Allow deeplinking to list pre-filtered by repository name or by policy name
  const [filteredRepository, setFilteredRepository] = useState<string | undefined>(undefined);
  const [filteredPolicy, setFilteredPolicy] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (search) {
      const parsedParams = parse(search.replace(/^\?/, ''), { sort: false });
      const { repository, policy } = parsedParams;

      if (policy && policy !== filteredPolicy) {
        setFilteredPolicy(String(policy));
        history.replace(`${BASE_PATH}/snapshots`);
      } else if (repository && repository !== filteredRepository) {
        setFilteredRepository(String(repository));
        history.replace(`${BASE_PATH}/snapshots`);
      }
    }
  }, [filteredPolicy, filteredRepository, history, search]);

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackUiMetric(UIM_SNAPSHOT_LIST_LOAD);
  }, [uiMetricService]);

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.loadingSnapshotsDescription"
          defaultMessage="Loading snapshots…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotList.loadingSnapshotsErrorMessage"
            defaultMessage="Error loading snapshots"
          />
        }
        error={error as Error}
      />
    );
  } else if (Object.keys(errors).length && repositories.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.errorRepositoriesTitle"
              defaultMessage="Some repositories contain errors"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.repositoryWarningDescription"
              defaultMessage="Go to {repositoryLink} to fix the errors."
              values={{
                repositoryLink: (
                  <EuiLink {...reactRouterNavigate(history, linkToRepositories())}>
                    <FormattedMessage
                      id="xpack.snapshotRestore.repositoryWarningLinkText"
                      defaultMessage="Repositories"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
      />
    );
  } else if (repositories.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesTitle"
              defaultMessage="Start by registering a repository"
            />
          </h1>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesDescription"
                defaultMessage="You need a place where your snapshots will live."
              />
            </p>
            <p>
              <EuiButton
                {...reactRouterNavigate(history, linkToAddRepository())}
                fill
                iconType="plusInCircle"
                data-test-subj="registerRepositoryButton"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.snapshotList.emptyPrompt.noRepositoriesAddButtonLabel"
                  defaultMessage="Register a repository"
                />
              </EuiButton>
            </p>
          </>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else if (snapshots.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsTitle"
              defaultMessage="You don't have any snapshots yet"
            />
          </h1>
        }
        body={
          <WithPrivileges privileges={APP_SLM_CLUSTER_PRIVILEGES.map((name) => `cluster.${name}`)}>
            {({ hasPrivileges }) =>
              hasPrivileges ? (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.snapshotList.emptyPrompt.usePolicyDescription"
                      defaultMessage="Run a Snapshot Lifecycle Policy to create a snapshot.
                        Snapshots can also be created by using {docLink}."
                      values={{
                        docLink: (
                          <EuiLink
                            href={documentationLinksService.getSnapshotDocUrl()}
                            target="_blank"
                            data-test-subj="documentationLink"
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.emptyPrompt.usePolicyDocLinkText"
                              defaultMessage="the Elasticsearch API"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                  <p>
                    {policies.length === 0 ? (
                      <EuiButton
                        {...reactRouterNavigate(history, linkToAddPolicy())}
                        fill
                        iconType="plusInCircle"
                        data-test-subj="addPolicyButton"
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.snapshotList.emptyPrompt.addPolicyText"
                          defaultMessage="Create a policy"
                        />
                      </EuiButton>
                    ) : (
                      <EuiButton
                        {...reactRouterNavigate(history, linkToPolicies())}
                        fill
                        iconType="list"
                        data-test-subj="goToPoliciesButton"
                      >
                        <FormattedMessage
                          id="xpack.snapshotRestore.snapshotList.emptyPrompt.goToPoliciesText"
                          defaultMessage="View policies"
                        />
                      </EuiButton>
                    )}
                  </p>
                </Fragment>
              ) : (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.snapshotList.emptyPrompt.noSnapshotsDescription"
                      defaultMessage="Create a snapshot using the Elasticsearch API."
                    />
                  </p>
                  <p>
                    <EuiLink
                      href={documentationLinksService.getSnapshotDocUrl()}
                      target="_blank"
                      data-test-subj="documentationLink"
                    >
                      <FormattedMessage
                        id="xpack.snapshotRestore.emptyPrompt.noSnapshotsDocLinkText"
                        defaultMessage="Learn how to create a snapshot"
                      />{' '}
                      <EuiIcon type="link" />
                    </EuiLink>
                  </p>
                </Fragment>
              )
            }
          </WithPrivileges>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    const repositoryErrorsWarning = Object.keys(errors).length ? (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryWarningTitle"
              defaultMessage="Some repositories contain errors"
            />
          }
          color="warning"
          iconType="alert"
        >
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryWarningDescription"
            defaultMessage="Snapshots might load slowly. Go to {repositoryLink} to fix the errors."
            values={{
              repositoryLink: (
                <EuiLink {...reactRouterNavigate(history, linkToRepositories())}>
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryWarningLinkText"
                    defaultMessage="Repositories"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    ) : null;

    content = (
      <Fragment>
        {repositoryErrorsWarning}

        <SnapshotTable
          snapshots={snapshots}
          repositories={repositories}
          reload={reload}
          openSnapshotDetailsUrl={openSnapshotDetailsUrl}
          onSnapshotDeleted={onSnapshotDeleted}
          repositoryFilter={filteredRepository}
          policyFilter={filteredPolicy}
        />
      </Fragment>
    );
  }

  return (
    <section data-test-subj="snapshotList">
      {repositoryName && snapshotId ? (
        <SnapshotDetails
          repositoryName={repositoryName}
          snapshotId={snapshotId}
          onClose={closeSnapshotDetails}
          onSnapshotDeleted={onSnapshotDeleted}
        />
      ) : null}
      {content}
    </section>
  );
};
