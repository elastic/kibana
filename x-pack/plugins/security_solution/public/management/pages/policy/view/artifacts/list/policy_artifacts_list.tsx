/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';

import {
  GetTrustedListAppsResponse,
  Immutable,
  TrustedApp,
} from '../../../../../../../common/endpoint/types';
import { Loader } from '../../../../../../common/components/loader';
import { ArtifactEntryCardMinified } from '../../../../../components/artifact_entry_card';

interface PolicyArtifactsListProps {
  artifacts: Immutable<GetTrustedListAppsResponse | undefined>; // Or other artifacts type like Event Filters or Endpoint Exceptions
  defaultSelectedArtifactIds: string[];
  selectedArtifactsUpdated: (ids: string[]) => void;
  isListLoading: boolean;
}

export const PolicyArtifactsList = React.memo<PolicyArtifactsListProps>(
  ({ artifacts, isListLoading, defaultSelectedArtifactIds, selectedArtifactsUpdated }) => {
    const [selectedArtifactIdsByKey, setSelectedArtifactIdsByKey] = useState(
      defaultSelectedArtifactIds.reduce(
        (acc: { [key: string]: boolean }, current) => ({ ...acc, [current]: true }),
        {}
      )
    );

    useEffect(() => {
      const selectedArray: string[] = [];

      Object.keys(selectedArtifactIdsByKey).forEach((key) => {
        if (selectedArtifactIdsByKey[key]) {
          selectedArray.push(key);
        }
      });
      selectedArtifactsUpdated(selectedArray);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedArtifactIdsByKey]);

    const availableList = useMemo(() => {
      if (!artifacts || !artifacts.data.length) return null;
      const items = Array.from(artifacts.data) as TrustedApp[];
      return items.map((artifact) => (
        <ArtifactEntryCardMinified
          key={artifact.id}
          item={artifact}
          isSelected={selectedArtifactIdsByKey[artifact.id] || false}
          onToggleSelectedArtifact={(selected) =>
            setSelectedArtifactIdsByKey({ ...selectedArtifactIdsByKey, [artifact.id]: selected })
          }
        />
      ));
    }, [artifacts, selectedArtifactIdsByKey]);

    return isListLoading ? <Loader size="xl" /> : <div>{availableList}</div>;
  }
);

PolicyArtifactsList.displayName = 'PolicyArtifactsList';
