/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SummarizedCopyToSpaceResult, SummarizedSavedObjectResult } from '..';

interface Props {
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  object: { type: string; id: string };
  overwritePending: boolean;
  conflictResolutionInProgress: boolean;
}

export const CopyStatusIndicator = (props: Props) => {
  const { summarizedCopyResult, conflictResolutionInProgress } = props;
  if (summarizedCopyResult.processing || conflictResolutionInProgress) {
    return <EuiLoadingSpinner />;
  }

  const objectResult = summarizedCopyResult.objects.find(
    (o) => o.type === props.object!.type && o.id === props.object!.id
  ) as SummarizedSavedObjectResult;

  const successful =
    !objectResult.hasUnresolvableErrors &&
    (objectResult.conflicts.length === 0 || props.overwritePending === true);
  const successColor = props.overwritePending ? 'warning' : 'success';
  const hasConflicts = objectResult.conflicts.length > 0;
  const hasUnresolvableErrors = objectResult.hasUnresolvableErrors;

  if (successful) {
    const message = props.overwritePending ? (
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingOverwriteMessage"
        defaultMessage="Saved object will be overwritten. Click 'Skip' to cancel this operation."
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.successMessage"
        defaultMessage="Saved object copied successfully."
      />
    );
    return <EuiIconTip type={'check'} color={successColor} content={message} />;
  }
  if (hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'cross'}
        color={'danger'}
        data-test-subj={`cts-object-result-error-${objectResult.id}`}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.unresolvableErrorMessage"
            defaultMessage="There was an error copying this saved object."
          />
        }
      />
    );
  }
  if (hasConflicts) {
    return (
      <EuiIconTip
        type={'alert'}
        color={'warning'}
        content={
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.copyStatus.conflictsMessage"
                defaultMessage="A saved object with a matching id ({id}) already exists in this space."
                values={{
                  id: objectResult.conflicts[0].obj.id,
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.copyStatus.conflictsOverwriteMessage"
                defaultMessage="Click 'Overwrite' to replace this version with the copied one."
              />
            </p>
          </EuiText>
        }
      />
    );
  }
  return null;
};
