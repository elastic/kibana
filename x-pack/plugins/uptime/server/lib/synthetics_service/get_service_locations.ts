/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { pick } from 'lodash';
import {
  ManifestLocation,
  ServiceLocation,
  Locations,
  ThrottlingOptions,
  BandwidthLimitKey,
} from '../../../common/runtime_types';
import { UptimeServerSetup } from '../adapters/framework';

export const getDevLocation = (devUrl: string): ServiceLocation => ({
  id: 'localhost',
  label: 'Local Synthetics Service',
  geo: { lat: 0, lon: 0 },
  url: devUrl,
  isServiceManaged: true,
});

export async function getServiceLocations(server: UptimeServerSetup) {
  let locations: Locations = [];

  if (process.env.NODE_ENV !== 'production' && server.config.service?.devUrl) {
    locations = [getDevLocation(server.config.service.devUrl)];
  }

  if (!server.config.service?.manifestUrl) {
    return { locations };
  }

  try {
    const { data } = await axios.get<{
      throttling: ThrottlingOptions;
      locations: Record<string, ManifestLocation>;
    }>(server.config.service!.manifestUrl!);

    Object.entries(data.locations).forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
        isServiceManaged: true,
      });
    });

    const throttling = pick(
      data.throttling,
      BandwidthLimitKey.DOWNLOAD,
      BandwidthLimitKey.UPLOAD
    ) as ThrottlingOptions;

    return { throttling, locations };
  } catch (e) {
    server.logger.error(e);
    return { locations: [] };
  }
}
