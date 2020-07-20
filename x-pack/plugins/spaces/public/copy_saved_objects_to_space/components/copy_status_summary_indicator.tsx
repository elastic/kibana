/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './copy_status_summary_indicator.scss';
import React, { Fragment } from 'react';
import { EuiLoadingSpinner, EuiIconTip, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Space } from '../../../common/model/space';
import { ImportRetry } from '../types';
import { ResolveAllConflicts } from './resolve_all_conflicts';
import { SummarizedCopyToSpaceResult } from '..';

interface Props {
  space: Space;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  conflictResolutionInProgress: boolean;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  onDestinationMapChange: (value?: Map<string, string>) => void;
}

const renderIcon = (props: Props) => {
  const {
    space,
    summarizedCopyResult,
    conflictResolutionInProgress,
    retries,
    onRetriesChange,
    onDestinationMapChange,
  } = props;
  const getDataTestSubj = (status: string) => `cts-summary-indicator-${status}-${space.id}`;

  if (summarizedCopyResult.processing || conflictResolutionInProgress) {
    return <EuiLoadingSpinner data-test-subj={getDataTestSubj('loading')} />;
  }

  if (summarizedCopyResult.successful) {
    return (
      <EuiIconTip
        type={'check'}
        color={'success'}
        iconProps={{
          'data-test-subj': getDataTestSubj('success'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.successMessage"
            defaultMessage="Copied successfully to the {space} space."
            values={{ space: space.name }}
          />
        }
      />
    );
  }
  if (summarizedCopyResult.hasUnresolvableErrors) {
    return (
      <EuiIconTip
        type={'cross'}
        color={'danger'}
        iconProps={{
          'data-test-subj': getDataTestSubj('failed'),
        }}
        content={
          <FormattedMessage
            id="xpack.spaces.management.copyToSpace.copyStatusSummary.failedMessage"
            defaultMessage="Copy to the {space} space failed. Expand this section for details."
            values={{ space: space.name }}
          />
        }
      />
    );
  }
  if (summarizedCopyResult.hasConflicts) {
    return (
      <Fragment>
        <ResolveAllConflicts
          summarizedCopyResult={summarizedCopyResult}
          retries={retries}
          onRetriesChange={onRetriesChange}
          onDestinationMapChange={onDestinationMapChange}
        />
        <EuiIconTip
          type={'alert'}
          color={'warning'}
          iconProps={{
            'data-test-subj': getDataTestSubj('conflicts'),
          }}
          content={
            <FormattedMessage
              id="xpack.spaces.management.copyToSpace.copyStatusSummary.conflictsMessage"
              defaultMessage="One or more conflicts detected in the {space} space. Expand this section to resolve."
              values={{ space: space.name }}
            />
          }
        />
      </Fragment>
    );
  }
  return null;
};

export const CopyStatusSummaryIndicator = (props: Props) => {
  const { summarizedCopyResult } = props;

  return (
    <Fragment>
      {renderIcon(props)}
      <EuiBadge color="#DDD" className="spcCopyToSpace__summaryCountBadge">
        {summarizedCopyResult.objects.length}
      </EuiBadge>
    </Fragment>
  );
};
