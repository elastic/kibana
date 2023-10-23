/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getKqlFilter } from '../../common';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { monitorAttributes, syntheticsMonitorType } from '../../../../common/types/saved_objects';

type Payload = Array<{
  id: string;
  count: number;
}>;

interface ExpectedResponse {
  locations: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

const aggs = {
  locations: {
    terms: {
      field: `${monitorAttributes}.locations.id`,
      size: 10000,
    },
  },
};

export const getLocationMonitors: SyntheticsRestApiRouteFactory<Payload> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,

  validate: {},
  handler: async ({ savedObjectsClient: soClient }) => {
    return await getMonitorsByLocation(soClient);
  },
});

export const getMonitorsByLocation = async (
  soClient: SavedObjectsClientContract,
  locationId?: string
) => {
  const locationFilter = getKqlFilter({ field: 'locations.id', values: locationId });

  const locationMonitors = await soClient.find<unknown, ExpectedResponse>({
    type: syntheticsMonitorType,
    perPage: 0,
    aggs,
    filter: locationFilter,
  });

  return (
    locationMonitors.aggregations?.locations.buckets.map(({ key: id, doc_count: count }) => ({
      id,
      count,
    })) ?? []
  );
};
