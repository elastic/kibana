/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { documentationLinksService } from '../../../services/documentation';
import { loadSnapshots } from '../../../services/http';

import { SnapshotDetails } from './snapshot_details';
import { SnapshotTable } from './snapshot_table';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface MatchParams {
  snapshotId?: string;
}
interface Props extends RouteComponentProps<MatchParams> {}

export const SnapshotList: React.FunctionComponent<Props> = ({
  match: {
    params: { snapshotId },
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

  const [currentSnapshot, setCurrentSnapshot] = useState<string | undefined>(undefined);

  const openSnapshotDetails = (id: string) => {
    setCurrentSnapshot(id);
    history.push(`${BASE_PATH}/snapshots/${id}`);
  };

  const closeSnapshotDetails = () => {
    setCurrentSnapshot(undefined);
    history.push(`${BASE_PATH}/snapshots`);
  };

  useEffect(
    () => {
      setCurrentSnapshot(snapshotId);
    },
    [snapshotId]
  );

  if (loading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.snapshotList.loadingSnapshots"
          defaultMessage="Loading snapshots…"
        />
      </SectionLoading>
    );
  }

  if (error) {
    return (
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
  }

  if (snapshots && snapshots.length === 0) {
    return (
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
  }

  return (
    <Fragment>
      {currentSnapshot ? (
        <SnapshotDetails snapshotId={currentSnapshot} onClose={closeSnapshotDetails} />
      ) : null}
      <SnapshotTable
        snapshots={snapshots || []}
        reload={reload}
        openSnapshotDetails={openSnapshotDetails}
      />
    </Fragment>
  );
};
