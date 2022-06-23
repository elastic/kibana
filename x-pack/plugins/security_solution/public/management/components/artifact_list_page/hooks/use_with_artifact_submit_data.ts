/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { ArtifactFormComponentProps } from '../types';
import { useCreateArtifact, useUpdateArtifact } from '../../../hooks/artifacts';

export const useWithArtifactSubmitData = (
  apiClient: ExceptionsListApiClient,
  mode: ArtifactFormComponentProps['mode']
) => {
  const artifactUpdater = useUpdateArtifact(apiClient);
  const artifactCreator = useCreateArtifact(apiClient);

  return mode === 'create' ? artifactCreator : artifactUpdater;
};
