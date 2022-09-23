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
  PublicLocation,
  PublicLocations,
  ThrottlingOptions,
  BandwidthLimitKey,
  LocationStatus,
} from '../../common/runtime_types';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters/framework';

export const getDevLocation = (devUrl: string): PublicLocation => ({
  id: 'localhost',
  label: 'Local Synthetics Service',
  geo: { lat: 0, lon: 0 },
  url: devUrl,
  isServiceManaged: true,
  status: LocationStatus.EXPERIMENTAL,
  isInvalid: false,
});

export async function getServiceLocations(server: UptimeServerSetup) {
  let locations: PublicLocations = [];

  if (server.config.service?.devUrl) {
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

    const availableLocations =
      server.isDev || server.config.service?.showExperimentalLocations
        ? Object.entries(data.locations)
        : Object.entries(data.locations).filter(([_, location]) => {
            return location.status === LocationStatus.GA;
          });

    availableLocations.forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
        isServiceManaged: true,
        status: location.status,
        isInvalid: false,
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
