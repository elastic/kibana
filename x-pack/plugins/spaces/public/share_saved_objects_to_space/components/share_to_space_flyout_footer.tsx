/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiStat, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ProcessedImportResponse } from '../../../../../../src/legacy/core_plugins/kibana/public';
import { ImportRetry } from '../types';

interface Props {
  shareInProgress: boolean;
  conflictResolutionInProgress: boolean;
  initialShareFinished: boolean;
  shareResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  numberOfSelectedSpaces: number;
  onShareStart: () => void;
  onShareFinish: () => void;
}
export const ShareToSpaceFlyoutFooter = (props: Props) => {
  const { shareInProgress, initialShareFinished, shareResult, retries } = props;

  let summarizedResults = {
    successCount: 0,
    overwriteConflictCount: 0,
    conflictCount: 0,
    unresolvableErrorCount: 0,
  };
  if (shareResult) {
    summarizedResults = Object.entries(shareResult).reduce((acc, result) => {
      const [spaceId, spaceResult] = result;
      const overwriteCount = (retries[spaceId] || []).filter(c => c.overwrite).length;
      return {
        loading: false,
        successCount: acc.successCount + spaceResult.importCount,
        overwriteConflictCount: acc.overwriteConflictCount + overwriteCount,
        conflictCount:
          acc.conflictCount +
          spaceResult.failedImports.filter(i => i.error.type === 'conflict').length -
          overwriteCount,
        unresolvableErrorCount:
          acc.unresolvableErrorCount +
          spaceResult.failedImports.filter(i => i.error.type !== 'conflict').length,
      };
    }, summarizedResults);
  }

  const getButton = () => {
    let actionButton;
    if (initialShareFinished) {
      const hasPendingOverwrites = summarizedResults.overwriteConflictCount > 0;

      const buttonText = hasPendingOverwrites ? (
        <FormattedMessage
          id="xpack.spaces.management.shareToSpace.finishPendingOverwritesShareToSpacesButton"
          defaultMessage="Overwrite {overwriteCount} objects"
          values={{ overwriteCount: summarizedResults.overwriteConflictCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.spaces.management.shareToSpace.finishShareToSpacesButton"
          defaultMessage="Finish"
        />
      );
      actionButton = (
        <EuiButton
          fill
          isLoading={props.conflictResolutionInProgress}
          aria-live="assertive"
          aria-label={
            props.conflictResolutionInProgress
              ? i18n.translate('xpack.spaces.management.shareToSpace.inProgressButtonLabel', {
                  defaultMessage: 'Share is in progress. Please wait.',
                })
              : i18n.translate('xpack.spaces.management.shareToSpace.finishedButtonLabel', {
                  defaultMessage: 'Share finished.',
                })
          }
          onClick={() => props.onShareFinish()}
          data-test-subj="cts-finish-button"
        >
          {buttonText}
        </EuiButton>
      );
    } else {
      actionButton = (
        <EuiButton
          fill
          isLoading={shareInProgress}
          onClick={() => props.onShareStart()}
          data-test-subj="cts-initiate-button"
          disabled={props.numberOfSelectedSpaces === 0 || shareInProgress}
        >
          {props.numberOfSelectedSpaces > 0 ? (
            <FormattedMessage
              id="xpack.spaces.management.shareToSpace.shareToSpacesButton"
              defaultMessage="Share to {spaceCount} {spaceCount, plural, one {space} other {spaces}}"
              values={{ spaceCount: props.numberOfSelectedSpaces }}
            />
          ) : (
            <FormattedMessage
              id="xpack.spaces.management.shareToSpace.disabledShareToSpacesButton"
              defaultMessage="Share"
            />
          )}
        </EuiButton>
      );
    }

    return (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>{actionButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  if (!shareInProgress) {
    return getButton();
  }

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-success-count`}
            title={summarizedResults.successCount}
            titleSize="s"
            titleColor={initialShareFinished ? 'secondary' : 'subdued'}
            isLoading={!initialShareFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.shareToSpaceFlyoutFooter.successCount"
                defaultMessage="Copied"
              />
            }
          />
        </EuiFlexItem>
        {summarizedResults.overwriteConflictCount > 0 && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj={`cts-summary-overwrite-count`}
              title={summarizedResults.overwriteConflictCount}
              titleSize="s"
              titleColor={summarizedResults.overwriteConflictCount > 0 ? 'primary' : 'subdued'}
              isLoading={!initialShareFinished}
              textAlign="center"
              description={
                <FormattedMessage
                  id="xpack.spaces.management.shareToSpaceFlyoutFooter.pendingCount"
                  defaultMessage="Pending"
                />
              }
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-conflict-count`}
            title={summarizedResults.conflictCount}
            titleSize="s"
            titleColor={summarizedResults.conflictCount > 0 ? 'primary' : 'subdued'}
            isLoading={!initialShareFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.shareToSpaceFlyoutFooter.conflictCount"
                defaultMessage="Skipped"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-error-count`}
            title={summarizedResults.unresolvableErrorCount}
            titleSize="s"
            titleColor={summarizedResults.unresolvableErrorCount > 0 ? 'danger' : 'subdued'}
            isLoading={!initialShareFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.shareToSpaceFlyoutFooter.errorCount"
                defaultMessage="Errors"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      {getButton()}
    </Fragment>
  );
};
