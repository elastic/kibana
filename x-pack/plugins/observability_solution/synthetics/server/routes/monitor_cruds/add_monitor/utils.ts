/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { CreateMonitorPayLoad } from './add_monitor_api';
import { MonitorFields, SyntheticsMonitor } from '../../../../common/runtime_types';
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

export const parseMonitorLocations = (
  monitorPayload: CreateMonitorPayLoad,
  prevLocations?: MonitorFields['locations'],
  ui: boolean = false
) => {
  const { locations, private_locations: privateLocations } = monitorPayload;

  let locs = locations
    ?.filter((loc) => typeof loc === 'string' || loc.isServiceManaged)
    .map((loc) => (typeof loc === 'string' ? loc : loc.id));
  const extractPvtLocs =
    locations?.filter((loc) => typeof loc !== 'string' && !loc.isServiceManaged) ?? [];
  let pvtLocs = [...(privateLocations ?? []), ...extractPvtLocs]?.map((loc) =>
    typeof loc === 'string' ? loc : loc.id
  );
  if (ui && !privateLocations && !locations && prevLocations) {
    locs = prevLocations.filter((loc) => loc.isServiceManaged).map((loc) => loc.id);
    pvtLocs = prevLocations.filter((loc) => !loc.isServiceManaged).map((loc) => loc.id);
  } else {
    if (prevLocations && !ui) {
      if (!locations && !privateLocations) {
        locs = prevLocations.filter((loc) => loc.isServiceManaged).map((loc) => loc.id);
        pvtLocs = prevLocations.filter((loc) => !loc.isServiceManaged).map((loc) => loc.id);
      } else {
        if (!privateLocations) {
          pvtLocs = [
            ...(pvtLocs ?? []),
            ...prevLocations.filter((loc) => !loc.isServiceManaged).map((loc) => loc.id),
          ];
          if (locations?.length === 0) {
            locs = [];
          } else {
            locs = [
              ...(locs ?? []),
              ...prevLocations.filter((loc) => loc.isServiceManaged).map((loc) => loc.id),
            ];
          }
        }
        if (!locations) {
          locs = [
            ...(locs ?? []),
            ...prevLocations.filter((loc) => loc.isServiceManaged).map((loc) => loc.id),
          ];
          if (privateLocations?.length === 0) {
            pvtLocs = [];
          } else {
            pvtLocs = [
              ...(pvtLocs ?? []),
              ...prevLocations.filter((loc) => !loc.isServiceManaged).map((loc) => loc.id),
            ];
          }
        }
      }
    }
  }
  return {
    locations: Array.from(new Set(locs)),
    privateLocations: Array.from(new Set(pvtLocs)),
  };
};
