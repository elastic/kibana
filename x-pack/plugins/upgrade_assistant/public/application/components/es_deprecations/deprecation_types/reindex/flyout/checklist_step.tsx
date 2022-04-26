/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ReindexStatus } from '../../../../../../../common/types';
import { LoadingState } from '../../../../types';
import type { ReindexState } from '../use_reindex_state';
import { ReindexProgress } from './progress';
import { useAppContext } from '../../../../../app_context';

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
          defaultMessage="Resume reindexing"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex, cancelReindex }) => {
  const {
    services: {
      api,
      core: { docLinks },
    },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;
  const isCompleted = status === ReindexStatus.completed;
  const hasFetchFailed = status === ReindexStatus.fetchFailed;
  const hasReindexingFailed = status === ReindexStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

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

        {nodes && nodes.length > 0 && (
          <>
            <EuiCallOut
              color="warning"
              iconType="alert"
              data-test-subj="lowDiskSpaceCallout"
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceCalloutTitle"
                  defaultMessage="Nodes with low disk space"
                />
              }
            >
              <>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceCalloutDescription"
                  defaultMessage="Disk usage has exceeded the low watermark, which may prevent reindexing. The following nodes are impacted:"
                />

                <EuiSpacer size="s" />

                <ul>
                  {nodes.map(({ nodeName, available, nodeId }) => (
                    <li key={nodeId} data-test-subj="impactedNodeListItem">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.lowDiskSpaceUsedText"
                        defaultMessage="{nodeName} ({available} available)"
                        values={{
                          nodeName,
                          available,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {(hasFetchFailed || hasReindexingFailed) && (
          <>
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
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexDescription"
              defaultMessage="The index will be read-only during reindexing. You won't be able to add, update, or delete documents until reindexing is complete. If you need to reindex to a new cluster, use the reindex API. {docsLink}"
              values={{
                docsLink: (
                  <EuiLink target="_blank" href={docLinks.links.upgradeAssistant.remoteReindex}>
                    {i18n.translate(
                      'xpack.upgradeAssistant.checkupTab.reindexing.flyout.learnMoreLinkLabel',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.readonlyCallout.backgroundResumeDetail"
              defaultMessage="Reindexing is performed in the background. You can return to the Upgrade Assistant to view progress or resume reindexing after a Kibana restart."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <ReindexProgress reindexState={reindexState} cancelReindex={cancelReindex} />
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
                onClick={startReindex}
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
