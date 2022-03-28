/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { parse } from 'query-string';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';

import {
  PageLoading,
  PageError,
  Error,
  reactRouterNavigate,
  useExecutionContext,
} from '../../../../shared_imports';
import { BASE_PATH, UIM_SNAPSHOT_LIST_LOAD } from '../../../constants';
import { useLoadSnapshots } from '../../../services/http';
import { linkToRepositories } from '../../../services/navigation';
import { useAppContext, useServices } from '../../../app_context';
import { useDecodedParams, SnapshotListParams, DEFAULT_SNAPSHOT_LIST_PARAMS } from '../../../lib';

import { SnapshotDetails } from './snapshot_details';
import {
  SnapshotTable,
  RepositoryEmptyPrompt,
  SnapshotEmptyPrompt,
  RepositoryError,
} from './components';

interface MatchParams {
  repositoryName?: string;
  snapshotId?: string;
}

export const SnapshotList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  location: { search },
  history,
}) => {
  const { repositoryName, snapshotId } = useDecodedParams<MatchParams>();
  const [listParams, setListParams] = useState<SnapshotListParams>(DEFAULT_SNAPSHOT_LIST_PARAMS);
  const {
    error,
    isInitialRequest,
    isLoading,
    data: {
      snapshots = [],
      repositories = [],
      policies = [],
      errors = {},
      total: totalSnapshotsCount,
    },
    resendRequest: reload,
  } = useLoadSnapshots(listParams);

  const { uiMetricService } = useServices();
  const { core } = useAppContext();

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

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'snapshotRestoreSnapshots',
  });

  // Allow deeplinking to list pre-filtered by repository name or by policy name
  useEffect(() => {
    if (search) {
      const parsedParams = parse(search.replace(/^\?/, ''), { sort: false });
      const { repository, policy } = parsedParams;

      if (policy) {
        setListParams((prev: SnapshotListParams) => ({
          ...prev,
          searchField: 'policyName',
          searchValue: String(policy),
          searchMatch: 'must',
          searchOperator: 'exact',
        }));
        history.replace(`${BASE_PATH}/snapshots`);
      } else if (repository) {
        setListParams((prev: SnapshotListParams) => ({
          ...prev,
          searchField: 'repository',
          searchValue: String(repository),
          searchMatch: 'must',
          searchOperator: 'exact',
        }));
        history.replace(`${BASE_PATH}/snapshots`);
      }
    }
  }, [listParams, history, search]);

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackUiMetric(UIM_SNAPSHOT_LIST_LOAD);
  }, [uiMetricService]);

  let content;

  // display "loading" section only on initial load, after that the table will have a loading indicator
  if (isInitialRequest && isLoading) {
    content = (
      <PageLoading>
        <span data-test-subj="snapshotListEmpty">
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotList.loadingSnapshotsDescription"
            defaultMessage="Loading snapshots…"
          />
        </span>
      </PageLoading>
    );
  } else if (error) {
    content = (
      <PageError
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
    content = <RepositoryError />;
  } else if (repositories.length === 0) {
    content = <RepositoryEmptyPrompt />;
  } else if (totalSnapshotsCount === 0 && !listParams.searchField && !isLoading) {
    content = <SnapshotEmptyPrompt policiesCount={policies.length} />;
  } else {
    const repositoryErrorsWarning = Object.keys(errors).length ? (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryWarningTitle"
              defaultMessage="Some repositories contain errors"
            />
          }
          color="warning"
          iconType="alert"
          data-test-subj="repositoryErrorsWarning"
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
      </>
    ) : null;

    content = (
      <section data-test-subj="snapshotList">
        {repositoryErrorsWarning}

        <SnapshotTable
          snapshots={snapshots}
          repositories={repositories}
          reload={reload}
          onSnapshotDeleted={onSnapshotDeleted}
          listParams={listParams}
          setListParams={setListParams}
          totalItemCount={totalSnapshotsCount}
          isLoading={isLoading}
        />
      </section>
    );
  }

  return (
    <>
      {repositoryName && snapshotId ? (
        <SnapshotDetails
          repositoryName={repositoryName}
          snapshotId={snapshotId}
          onClose={closeSnapshotDetails}
          onSnapshotDeleted={onSnapshotDeleted}
        />
      ) : null}
      {content}
    </>
  );
};
