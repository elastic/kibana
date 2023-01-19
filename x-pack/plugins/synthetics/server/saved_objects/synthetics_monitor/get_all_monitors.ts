/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { EncryptedSyntheticsMonitor } from '../../../common/runtime_types';

export const getAllMonitors = async ({
  soClient,
  search,
  fields,
  filter,
  sortField,
  sortOrder,
  searchFields,
}: {
  soClient: SavedObjectsClientContract;
  search?: string;
  filter?: string;
} & Pick<SavedObjectsFindOptions, 'sortField' | 'sortOrder' | 'fields' | 'searchFields'>) => {
  const finder = soClient.createPointInTimeFinder({
    type: syntheticsMonitorType,
    perPage: 1000,
    search,
    sortField,
    sortOrder,
    fields,
    filter,
    searchFields,
  });

  const hits: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];
  for await (const result of finder.find()) {
    hits.push(
      ...(result.saved_objects as Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>)
    );
  }

  // no need to wait for it
  finder.close();

  return hits;
};
