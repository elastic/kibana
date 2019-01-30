/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ReindexStatus } from '../../../../../../../common/types';
import { LoadingState } from '../../../../../types';
import { ReindexState } from '../polling_service';
import { ReindexProgress } from './progress';

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return 'Try again';
    case ReindexStatus.inProgress:
      return 'Reindexing…';
    case ReindexStatus.completed:
      return 'Done!';
    case ReindexStatus.paused:
      return 'Resume';
    default:
      return 'Run reindex';
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.StatelessComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex }) => {
  const {
    loadingState,
    status,
    reindexTaskPercComplete,
    lastCompletedStep,
    errorMessage,
  } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiCallOut
          title="Index is unable to ingest, update, or delete documents while reindexing"
          color="warning"
          iconType="alert"
        >
          <p>
            If you can’t stop document updates or need to reindex into a new cluster, consider using
            a different upgrade strategy.
          </p>
          <p>
            Reindexing will continue in the background, but if Kibana shuts down or restarts you
            will need to return to this page to resume reindexing.
          </p>
        </EuiCallOut>
        <EuiSpacer />
        <EuiTitle size="xs">
          <h3>Reindexing process</h3>
        </EuiTitle>
        <ReindexProgress
          lastCompletedStep={lastCompletedStep}
          reindexStatus={status}
          reindexTaskPercComplete={reindexTaskPercComplete}
          errorMessage={errorMessage}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color={status === ReindexStatus.paused ? 'warning' : 'primary'}
              iconType={status === ReindexStatus.paused ? 'play' : undefined}
              onClick={startReindex}
              isLoading={loading}
              disabled={loading || status === ReindexStatus.completed}
            >
              {buttonLabel(status)}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
