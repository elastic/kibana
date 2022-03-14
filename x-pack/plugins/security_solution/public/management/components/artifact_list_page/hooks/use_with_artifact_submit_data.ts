/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { ArtifactFormComponentProps } from '../types';
import { useUpdateArtifact } from './use_artifact_update_item';
import { useCreateArtifact } from './use_artifact_create_item';

export const useWithArtifactSubmitData = (
  apiClient: ExceptionsListApiClient,
  mode: ArtifactFormComponentProps['mode']
) => {
  const artifactUpdater = useUpdateArtifact(apiClient);
  const artifactCreator = useCreateArtifact(apiClient);

  return mode === 'create' ? artifactCreator : artifactUpdater;
};
