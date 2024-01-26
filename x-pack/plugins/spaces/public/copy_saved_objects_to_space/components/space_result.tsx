/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './space_result.scss';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { lazy, Suspense, useState } from 'react';

import { CopyStatusSummaryIndicator } from './copy_status_summary_indicator';
import { SpaceCopyResultDetails } from './space_result_details';
import { getSpaceAvatarComponent } from '../../space_avatar';
import type { SpacesDataEntry } from '../../types';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  space: SpacesDataEntry;
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
            <Suspense fallback={<EuiLoadingSpinner />}>
              <LazySpaceAvatar space={space} size="s" />
            </Suspense>
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
  const { space, summarizedCopyResult, retries, onRetriesChange, conflictResolutionInProgress } =
    props;
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
            <Suspense fallback={<EuiLoadingSpinner />}>
              <LazySpaceAvatar space={space} size="s" />
            </Suspense>
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
