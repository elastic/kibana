/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { SummarizedShareToSpaceResult } from '../index';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../../../common/model/space';
import { ShareStatusSummaryIndicator } from './share_status_summary_indicator';
import { SpaceShareResultDetails } from './space_result_details';
import { ImportRetry } from '../types';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  space: Space;
  summarizedShareResult: SummarizedShareToSpaceResult;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  conflictResolutionInProgress: boolean;
}

export const SpaceResult = (props: Props) => {
  const {
    space,
    summarizedShareResult,
    retries,
    onRetriesChange,
    savedObject,
    conflictResolutionInProgress,
  } = props;
  const spaceHasPendingOverwrites = retries.some(r => r.overwrite);

  return (
    <EuiAccordion
      id={`shareToSpace-${space.id}`}
      data-test-subj={`cts-space-result-${space.id}`}
      className="spcShareToSpaceResult"
      buttonContent={
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <SpaceAvatar space={space} size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>{space.name}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <ShareStatusSummaryIndicator
          space={space}
          summarizedShareResult={summarizedShareResult}
          conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
        />
      }
    >
      <EuiSpacer size="s" />
      <SpaceShareResultDetails
        savedObject={savedObject}
        summarizedShareResult={summarizedShareResult}
        space={space}
        retries={retries}
        onRetriesChange={onRetriesChange}
        conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
      />
    </EuiAccordion>
  );
};
