/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { Immutable } from '../../../../../../../common/endpoint/types';
import { TrustedAppsListData } from '../../../../trusted_apps/state';
import { Loader } from '../../../../../../common/components/loader';

interface PolicyArtifactsListProps {
  artifacts: Immutable<TrustedAppsListData | undefined>; // Or other artifacts type like Event Filters or Endpoint Exceptions
  selectedArtifactIds: string[];
  isListLoading: boolean;
  isSubmitLoading: boolean;
}

export const PolicyArtifactsList = React.memo<PolicyArtifactsListProps>(
  ({ artifacts, isListLoading }) => {
    const availableList = useMemo(() => {
      if (!artifacts || !artifacts.items.length) return null;
      const items = Array.from(artifacts.items);
      return (
        <>
          {items.map((artifact) => (
            <div key={artifact.id}>{artifact.name}</div>
          ))}
        </>
      );
    }, [artifacts]);
    return isListLoading ? <Loader size="xl" /> : null;
  }
);

PolicyArtifactsList.displayName = 'PolicyArtifactsList';
