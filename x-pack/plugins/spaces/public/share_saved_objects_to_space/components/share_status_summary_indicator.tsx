/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Space } from '../../../common/model/space';
import { SummarizedShareToSpaceResult } from '..';

interface Props {
  space: Space;
  summarizedShareResult: SummarizedShareToSpaceResult;
  conflictResolutionInProgress: boolean;
}

export const ShareStatusSummaryIndicator = (props: Props) => {
  const { summarizedShareResult } = props;
  const getDataTestSubj = (status: string) => `cts-summary-indicator-${status}-${props.space.id}`;

  if (summarizedShareResult.processing || props.conflictResolutionInProgress) {
    return <EuiLoadingSpinner data-test-subj={getDataTestSubj('loading')} />;
  }

  if (summarizedShareResult.successful) {
    return (
      <EuiIconTip
        type={'check'}
        color={'success'}
        iconProps={{
          'data-test-subj': getDataTestSubj('success'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareStatusSummary.successMessage"
            defaultMessage="Copied successfully to the {space} space."
            values={{ space: props.space.name }}
          />
        }
      />
    );
  }
  if (summarizedShareResult.hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'cross'}
        color={'danger'}
        iconProps={{
          'data-test-subj': getDataTestSubj('failed'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareStatusSummary.failedMessage"
            defaultMessage="Share to the {space} space failed. Expand this section for details."
            values={{ space: props.space.name }}
          />
        }
      />
    );
  }
  if (summarizedShareResult.hasConflicts) {
    return (
      <EuiIconTip
        type={'alert'}
        color={'warning'}
        iconProps={{
          'data-test-subj': getDataTestSubj('conflicts'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareStatusSummary.conflictsMessage"
            defaultMessage="One or more conflicts detected in the {space} space. Expand this section to resolve."
            values={{ space: props.space.name }}
          />
        }
      />
    );
  }
  return null;
};
