/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { documentationLinksService } from '../../../services/documentation';
import { loadSnapshots } from '../../../services/http';

import { SnapshotDetails } from './snapshot_details';
import { SnapshotTable } from './snapshot_table';

interface MatchParams {
  repositoryName?: string;
  snapshotId?: string;
}

export const SnapshotList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { repositoryName, snapshotId },
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
    data: { snapshots },
    request: reload,
  } = loadSnapshots();

  const openSnapshotDetails = (repositoryNameToOpen: string, snapshotIdToOpen: string) => {
    history.push(`${BASE_PATH}/snapshots/${repositoryNameToOpen}/${snapshotIdToOpen}`);
  };

  const closeSnapshotDetails = () => {
    history.push(`${BASE_PATH}/snapshots`);
  };

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.loadingSnapshots"
          defaultMessage="Loading snapshots…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.snapshotList.errorLoadingSnapshots"
            defaultMessage="Error loading snapshots"
          />
        }
        error={error}
      />
    );
  } else if (snapshots && snapshots.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.snapshotList.emptyPromptTitle"
              defaultMessage="No snapshots found"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.snapshotList.emptyPromptDescription"
                defaultMessage="Use snapshots to back up your Elasticsearch clusters."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            href={documentationLinksService.getSnapshotDocUrl()}
            target="_blank"
            fill
            iconType="questionInCircle"
            data-test-subj="srSnapshotsEmptyPromptAddButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.addSnapshotButtonLabel"
              defaultMessage="Learn about creating snapshots"
            />
          </EuiButton>
        }
      />
    );
  } else {
    content = (
      <SnapshotTable
        snapshots={snapshots || []}
        reload={reload}
        openSnapshotDetails={openSnapshotDetails}
      />
    );
  }

  return (
    <Fragment>
      {repositoryName && snapshotId ? (
        <SnapshotDetails
          repositoryName={repositoryName}
          snapshotId={snapshotId}
          onClose={closeSnapshotDetails}
        />
      ) : null}
      {content}
    </Fragment>
  );
};
