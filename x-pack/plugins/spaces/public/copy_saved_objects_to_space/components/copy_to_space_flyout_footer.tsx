/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ProcessedImportResponse, FailedImport } from 'src/plugins/saved_objects_management/public';
import { ImportRetry } from '../types';

interface Props {
  copyInProgress: boolean;
  conflictResolutionInProgress: boolean;
  initialCopyFinished: boolean;
  copyResult: Record<string, ProcessedImportResponse>;
  retries: Record<string, ImportRetry[]>;
  numberOfSelectedSpaces: number;
  onClose: () => void;
  onCopyStart: () => void;
  onCopyFinish: () => void;
}

const isResolvableError = ({ error: { type } }: FailedImport) =>
  ['conflict', 'ambiguous_conflict', 'missing_references'].includes(type);
const isUnresolvableError = (failure: FailedImport) => !isResolvableError(failure);

export const CopyToSpaceFlyoutFooter = (props: Props) => {
  const {
    copyInProgress,
    conflictResolutionInProgress,
    initialCopyFinished,
    copyResult,
    retries,
  } = props;

  let summarizedResults = {
    successCount: 0,
    pendingCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };
  if (copyResult) {
    summarizedResults = Object.entries(copyResult).reduce((acc, result) => {
      const [spaceId, spaceResult] = result;
      let successCount = 0;
      let pendingCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      if (spaceResult.status === 'success') {
        successCount = spaceResult.importCount;
      } else {
        const uniqueResolvableErrors = spaceResult.failedImports
          .filter(isResolvableError)
          .reduce((set, { obj: { type, id } }) => set.add(`${type}:${id}`), new Set<string>());
        pendingCount = (retries[spaceId] || []).length;
        skippedCount =
          uniqueResolvableErrors.size + spaceResult.successfulImports.length - pendingCount;
        errorCount = spaceResult.failedImports.filter(isUnresolvableError).length;
      }
      return {
        loading: false,
        successCount: acc.successCount + successCount,
        pendingCount: acc.pendingCount + pendingCount,
        skippedCount: acc.skippedCount + skippedCount,
        errorCount: acc.errorCount + errorCount,
      };
    }, summarizedResults);
  }

  const getButton = () => {
    let actionButton;
    if (initialCopyFinished) {
      const hasPendingRetries = summarizedResults.pendingCount > 0;

      const buttonText = hasPendingRetries ? (
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.finishPendingOverwritesCopyToSpacesButton"
          defaultMessage="Copy {overwriteCount} objects"
          values={{ overwriteCount: summarizedResults.pendingCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.spaces.management.copyToSpace.finishCopyToSpacesButton"
          defaultMessage="Finish"
        />
      );
      actionButton = (
        <EuiButton
          fill
          isLoading={conflictResolutionInProgress}
          aria-live="assertive"
          aria-label={
            conflictResolutionInProgress
              ? i18n.translate('xpack.spaces.management.copyToSpace.inProgressButtonLabel', {
                  defaultMessage: 'Copy is in progress. Please wait.',
                })
              : i18n.translate('xpack.spaces.management.copyToSpace.finishedButtonLabel', {
                  defaultMessage: 'Copy finished.',
                })
          }
          onClick={() => props.onCopyFinish()}
          data-test-subj="cts-finish-button"
        >
          {buttonText}
        </EuiButton>
      );
    } else {
      actionButton = (
        <EuiButton
          fill
          isLoading={copyInProgress}
          onClick={() => props.onCopyStart()}
          data-test-subj="cts-initiate-button"
          disabled={props.numberOfSelectedSpaces === 0 || copyInProgress}
        >
          {props.numberOfSelectedSpaces > 0 ? (
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyToSpacesButton"
              defaultMessage="Copy to {spaceCount} {spaceCount, plural, one {space} other {spaces}}"
              values={{ spaceCount: props.numberOfSelectedSpaces }}
            />
          ) : (
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.disabledCopyToSpacesButton"
              defaultMessage="Copy"
            />
          )}
        </EuiButton>
      );
    }

    return (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => props.onClose()}
            data-test-subj="cts-cancel-button"
            disabled={
              // Cannot cancel while the operation is in progress, or after some objects have already been created
              (copyInProgress && !initialCopyFinished) ||
              conflictResolutionInProgress ||
              summarizedResults.successCount > 0
            }
          >
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{actionButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  if (!copyInProgress) {
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
            titleColor={initialCopyFinished ? 'secondary' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.successCount"
                defaultMessage="Copied"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-pending-count`}
            title={summarizedResults.pendingCount}
            titleSize="s"
            titleColor={summarizedResults.pendingCount > 0 ? 'primary' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.pendingCount"
                defaultMessage="Pending"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-skipped-count`}
            title={summarizedResults.skippedCount}
            titleSize="s"
            titleColor={summarizedResults.skippedCount > 0 ? 'primary' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.skippedCount"
                defaultMessage="Skipped"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            data-test-subj={`cts-summary-error-count`}
            title={summarizedResults.errorCount}
            titleSize="s"
            titleColor={summarizedResults.errorCount > 0 ? 'danger' : 'subdued'}
            isLoading={!initialCopyFinished}
            textAlign="center"
            description={
              <FormattedMessage
                id="xpack.spaces.management.copyToSpaceFlyoutFooter.errorCount"
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
