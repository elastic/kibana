/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import {
  ManifestLocation,
  ServiceLocations,
  ServiceLocationsApiResponse,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../adapters/framework';

export async function getServiceLocations(server: UptimeServerSetup) {
  const locations: ServiceLocations = [];

  if (!server.config.service?.manifestUrl) {
    return { locations };
  }

  try {
    const { data } = await axios.get<{ locations: Record<string, ManifestLocation> }>(
      server.config.service!.manifestUrl!
    );

    Object.entries(data.locations).forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
      });
    });

    return { locations } as ServiceLocationsApiResponse;
  } catch (e) {
    server.logger.error(e);
    return {
      locations: [],
    } as ServiceLocationsApiResponse;
  }
}
