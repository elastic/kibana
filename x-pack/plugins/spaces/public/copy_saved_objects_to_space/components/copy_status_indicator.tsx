/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiLoadingSpinner, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ImportRetry } from '../types';
import { SummarizedCopyToSpaceResult, SummarizedSavedObjectResult } from '..';

interface Props {
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  object: { type: string; id: string };
  pendingObjectRetry?: ImportRetry;
  conflictResolutionInProgress: boolean;
}

export const CopyStatusIndicator = (props: Props) => {
  const { summarizedCopyResult, conflictResolutionInProgress, pendingObjectRetry } = props;
  if (summarizedCopyResult.processing || conflictResolutionInProgress) {
    return <EuiLoadingSpinner />;
  }

  const objectResult = summarizedCopyResult.objects.find(
    (o) => o.type === props.object!.type && o.id === props.object!.id
  ) as SummarizedSavedObjectResult;
  const { conflict, hasMissingReferences, hasUnresolvableErrors, overwrite } = objectResult;
  const hasConflicts = conflict && !pendingObjectRetry?.overwrite;
  const successful = !hasMissingReferences && !hasUnresolvableErrors && !hasConflicts;

  if (successful && !pendingObjectRetry) {
    // there is no retry pending, so this object was actually copied
    const message = overwrite ? (
      // the object was overwritten
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.successAutomaticOverwriteMessage"
        defaultMessage="Saved object overwritten successfully."
      />
    ) : (
      // the object was not overwritten
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.successMessage"
        defaultMessage="Saved object copied successfully."
      />
    );
    return <EuiIconTip type={'checkInCircleFilled'} color={'success'} content={message} />;
  }

  if (successful && pendingObjectRetry) {
    const message = overwrite ? (
      // this is an "automatic overwrite", e.g., the "Overwrite all conflicts" option was selected
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingAutomaticOverwriteMessage"
        defaultMessage="Saved object will be overwritten."
      />
    ) : pendingObjectRetry?.overwrite ? (
      // this is a manual overwrite, e.g., the individual "Overwrite?" switch was enabled
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingOverwriteMessage"
        defaultMessage="Saved object will be overwritten. Disable 'Overwrite' to cancel this operation."
      />
    ) : (
      // this object is pending success, but it will not result in an overwrite
      <FormattedMessage
        id="xpack.spaces.management.copyToSpace.copyStatus.pendingMessage"
        defaultMessage="Saved object will be copied."
      />
    );
    return <EuiIconTip type={'check'} color={'warning'} content={message} />;
  }

  if (hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'alert'}
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
          <Fragment>
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyStatus.conflictsMessage"
              defaultMessage="A saved object with a matching id ({id}) already exists in this space."
              values={{
                id: objectResult.conflict!.obj.id,
              }}
            />
            <EuiSpacer />
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyStatus.conflictsOverwriteMessage"
              defaultMessage="Enable 'Overwrite' to replace this version with the copied one."
            />
          </Fragment>
        }
      />
    );
  }

  return hasMissingReferences ? (
    <EuiIconTip
      type={'link'}
      color={'warning'}
      data-test-subj={`cts-object-result-missing-references-${objectResult.id}`}
      content={
        overwrite ? (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesAutomaticOverwriteMessage"
            defaultMessage="This object has missing references; it will be overwritten, but one or more of its references are broken."
          />
        ) : conflict ? (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesOverwriteMessage"
            defaultMessage="This object has missing references; it will be overwritten, but one or more of its references are broken. Disable 'Overwrite' to cancel this operation."
          />
        ) : (
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatus.missingReferencesMessage"
            defaultMessage="Saved object has missing references; it will be copied, but one or more of its references are broken."
          />
        )
      }
    />
  ) : null;
};
