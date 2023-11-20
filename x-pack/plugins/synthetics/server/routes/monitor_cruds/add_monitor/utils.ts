/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SyntheticsMonitor } from '../../../../common/runtime_types';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

export const getPrivateLocationsForMonitor = async (
  soClient: SavedObjectsClientContract,
  normalizedMonitor: SyntheticsMonitor
) => {
  const { locations } = normalizedMonitor;
  const hasPrivateLocation = locations.filter((location) => !location.isServiceManaged);
  if (hasPrivateLocation.length === 0) {
    return [];
  }
  return await getPrivateLocations(soClient);
};
