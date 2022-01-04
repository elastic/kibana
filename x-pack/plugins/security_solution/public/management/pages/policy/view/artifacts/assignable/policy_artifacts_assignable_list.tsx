/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress } from '@elastic/eui';
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useMemo } from 'react';
import { GetTrustedAppsListResponse, Immutable } from '../../../../../../../common/endpoint/types';
import {
  AnyArtifact,
  ArtifactEntryCardMinified,
} from '../../../../../components/artifact_entry_card';

export interface PolicyArtifactsAssignableListProps {
  // TrustedApps is still migrating to use FoundExceptionListItemSchema and the compatibility is
  // not 100% gurantee in types even though in runtime they are the same data structure
  artifacts:
    | Immutable<GetTrustedAppsListResponse | undefined>
    | FoundExceptionListItemSchema
    | undefined;
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
      const items = artifacts.data as AnyArtifact[];
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

    return (
      <>
        {isListLoading && (
          <EuiProgress size="xs" color="primary" data-test-subj="artifactsAssignableListLoader" />
        )}
        <div>{assignableList}</div>
      </>
    );
  }
);

PolicyArtifactsAssignableList.displayName = 'PolicyArtifactsAssignableList';
