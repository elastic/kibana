/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';

interface UpdateLastBackingIndexSettingsResponse {
  acknowledged: boolean | undefined;
  error?: string;
}

export async function updateLastBackingIndexSettings({
  datasetQualityESClient,
  lastBackingIndex,
  newFieldLimit,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  lastBackingIndex: string;
  newFieldLimit: number;
}): Promise<UpdateLastBackingIndexSettingsResponse> {
  const newSettings = {
    'index.mapping.total_fields.limit': newFieldLimit,
  };

  try {
    const { acknowledged } = await datasetQualityESClient.updateSettings({
      index: lastBackingIndex,
      settings: newSettings,
    });

    return { acknowledged };
  } catch (error) {
    return {
      acknowledged: undefined, // acknowledge is undefined when the request fails
      error: error.message,
    };
  }
}
