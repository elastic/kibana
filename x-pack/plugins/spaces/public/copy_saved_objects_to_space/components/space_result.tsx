/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './space_result.scss';
import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { SummarizedCopyToSpaceResult } from '../index';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../../../common/model/space';
import { CopyStatusSummaryIndicator } from './copy_status_summary_indicator';
import { SpaceCopyResultDetails } from './space_result_details';
import { ImportRetry } from '../types';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  space: Space;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  conflictResolutionInProgress: boolean;
}

const getInitialDestinationMap = (objects: SummarizedCopyToSpaceResult['objects']) =>
  objects.reduce((acc, { type, id, conflict }) => {
    if (conflict?.error.type === 'ambiguous_conflict') {
      acc.set(`${type}:${id}`, conflict.error.destinations[0].id);
    }
    return acc;
  }, new Map<string, string>());

export const SpaceResultProcessing = (props: Pick<Props, 'space'>) => {
  const { space } = props;
  return (
    <EuiAccordion
      id={`copyToSpace-${space.id}`}
      data-test-subj={`cts-space-result-${space.id}`}
      className="spcCopyToSpaceResult"
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
      extraAction={<EuiLoadingSpinner />}
    >
      <EuiSpacer size="s" />
      <EuiLoadingSpinner />
    </EuiAccordion>
  );
};

export const SpaceResult = (props: Props) => {
  const {
    space,
    summarizedCopyResult,
    retries,
    onRetriesChange,
    savedObject,
    conflictResolutionInProgress,
  } = props;
  const { objects } = summarizedCopyResult;
  const spaceHasPendingOverwrites = retries.some((r) => r.overwrite);
  const [destinationMap, setDestinationMap] = useState(getInitialDestinationMap(objects));
  const onDestinationMapChange = (value?: Map<string, string>) => {
    setDestinationMap(value || getInitialDestinationMap(objects));
  };

  return (
    <EuiAccordion
      id={`copyToSpace-${space.id}`}
      data-test-subj={`cts-space-result-${space.id}`}
      className="spcCopyToSpaceResult"
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
        <CopyStatusSummaryIndicator
          space={space}
          retries={retries}
          onRetriesChange={onRetriesChange}
          onDestinationMapChange={onDestinationMapChange}
          summarizedCopyResult={summarizedCopyResult}
          conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
        />
      }
    >
      <EuiSpacer size="s" />
      <SpaceCopyResultDetails
        savedObject={savedObject}
        summarizedCopyResult={summarizedCopyResult}
        space={space}
        retries={retries}
        onRetriesChange={onRetriesChange}
        destinationMap={destinationMap}
        onDestinationMapChange={onDestinationMapChange}
        conflictResolutionInProgress={conflictResolutionInProgress && spaceHasPendingOverwrites}
      />
    </EuiAccordion>
  );
};
