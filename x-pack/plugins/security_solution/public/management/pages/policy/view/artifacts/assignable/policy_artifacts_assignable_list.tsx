/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import {
  GetTrustedAppsListResponse,
  Immutable,
  TrustedApp,
} from '../../../../../../../common/endpoint/types';
import { Loader } from '../../../../../../common/components/loader';
import { ArtifactEntryCardMinified } from '../../../../../components/artifact_entry_card';

export interface PolicyArtifactsAssignableListProps {
  artifacts: Immutable<GetTrustedAppsListResponse | undefined>; // Or other artifacts type like Event Filters or Endpoint Exceptions
  selectedArtifactIds: string[];
  selectedArtifactsUpdated: (id: string, selected: boolean) => void;
  isListLoading: boolean;
}

export const PolicyArtifactsAssignableList = React.memo<PolicyArtifactsAssignableListProps>(
  ({ artifacts, isListLoading, selectedArtifactIds, selectedArtifactsUpdated }) => {
    const selectedArtifactIdsByKey = useMemo(
      () =>
        selectedArtifactIds.reduce(
          (acc: { [key: string]: boolean }, current) => ({ ...acc, [current]: true }),
          {}
        ),
      [selectedArtifactIds]
    );

    const assignableList = useMemo(() => {
      if (!artifacts || !artifacts.data.length) return null;
      const items = Array.from(artifacts.data) as TrustedApp[];
      return (
        <div data-test-subj="artifactsList">
          {items.map((artifact) => (
            <ArtifactEntryCardMinified
              key={artifact.id}
              item={artifact}
              isSelected={selectedArtifactIdsByKey[artifact.id] || false}
              onToggleSelectedArtifact={(selected) =>
                selectedArtifactsUpdated(artifact.id, selected)
              }
            />
          ))}
        </div>
      );
    }, [artifacts, selectedArtifactIdsByKey, selectedArtifactsUpdated]);

    return isListLoading ? <Loader size="xl" /> : <div>{assignableList}</div>;
  }
);

PolicyArtifactsAssignableList.displayName = 'PolicyArtifactsAssignableList';
