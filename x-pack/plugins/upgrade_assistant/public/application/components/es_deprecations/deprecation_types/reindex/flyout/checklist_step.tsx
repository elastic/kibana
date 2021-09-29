/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';

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
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE } from '@kbn/analytics';

import { ReindexStatus } from '../../../../../../../common/types';
import {
  uiMetricService,
  UIM_REINDEX_START_CLICK,
  UIM_REINDEX_STOP_CLICK,
} from '../../../../../lib/ui_metric';
import { LoadingState } from '../../../../types';
import type { ReindexState } from '../use_reindex_state';
import { ReindexProgress } from './progress';

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.paused:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.resumeLabel"
          defaultMessage="Resume"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.runReindexLabel"
          defaultMessage="Run reindex"
        />
      );
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.FunctionComponent<{
  renderGlobalCallouts: () => React.ReactNode;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex, cancelReindex, renderGlobalCallouts }) => {
  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;
  const isCompleted = status === ReindexStatus.completed;
  const hasFetchFailed = status === ReindexStatus.fetchFailed;
  const hasReindexingFailed = status === ReindexStatus.failed;

  const onStartReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_START_CLICK);
    startReindex();
  }, [startReindex]);

  const onStopReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_STOP_CLICK);
    cancelReindex();
  }, [cancelReindex]);

  return (
    <Fragment>
      <EuiFlyoutBody>
        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to reindex this index"
                />
              }
              color="danger"
              iconType="alert"
            />
          </Fragment>
        )}
        {(hasFetchFailed || hasReindexingFailed) && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              iconType="alert"
              data-test-subj={hasFetchFailed ? 'fetchFailedCallout' : 'reindexingFailedCallout'}
              title={
                hasFetchFailed ? (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.fetchFailedCalloutTitle"
                    defaultMessage="Reindex status not available"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingFailedCalloutTitle"
                    defaultMessage="Reindexing error"
                  />
                )
              }
            >
              {reindexState.errorMessage}
            </EuiCallOut>
          </>
        )}
        {renderGlobalCallouts()}
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.readonlyCallout.calloutTitle"
              defaultMessage="Index is unable to ingest, update, or delete documents while reindexing"
            />
          }
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.readonlyCallout.cantStopDetail"
              defaultMessage="If you can’t stop document updates or need to reindex into a new cluster,
                consider using a different upgrade strategy."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.readonlyCallout.backgroundResumeDetail"
              defaultMessage="Reindexing will continue in the background, but if Kibana shuts down or restarts you will
                need to return to this page to resume reindexing."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer />
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklistTitle"
              defaultMessage="Reindexing process"
            />
          </h3>
        </EuiTitle>
        <ReindexProgress reindexState={reindexState} cancelReindex={onStopReindex} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color={status === ReindexStatus.paused ? 'warning' : 'primary'}
                iconType={status === ReindexStatus.paused ? 'play' : undefined}
                onClick={onStartReindex}
                isLoading={loading}
                disabled={loading || !hasRequiredPrivileges}
                data-test-subj="startReindexingButton"
              >
                {buttonLabel(status)}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
