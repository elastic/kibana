/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';

import { TrustedAppsListData } from '../../../../trusted_apps/state';

interface PolicyArtifactsListProps {
  artifacts: TrustedAppsListData; // Or other artifacts type like Event Filters or Endpoint Exceptions
  selectedArtifactIds: string[];
  isListLoading: boolean;
  isSubmitLoading: boolean;
}

export const PolicyArtifactsList = React.memo<PolicyArtifactsListProps>(
  (artifacts, selectedArtifacts, isListLoading, isSubmitLoading) => {
    return <>{'test'}</>;
  }
);

PolicyArtifactsList.displayName = 'PolicyArtifactsList';
