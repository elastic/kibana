/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { ManifestLocation, ServiceLocations } from '../../../common/types';

export async function getServiceLocations({ manifestUrl }: { manifestUrl: string }) {
  const locations: ServiceLocations = [];
  try {
    const { data } = await axios.get<Record<string, ManifestLocation>>(manifestUrl);

    Object.entries(data.locations).forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
      });
    });

    return locations;
  } catch (e) {
    return [];
  }
}
