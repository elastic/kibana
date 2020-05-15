/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorLocations, MonitorLocation } from '../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../common/constants';

/**
 * Fetch data for the monitor page title.
 */
export interface GetMonitorLocationsParams {
  /**
   * @member monitorId the ID to query
   */
  monitorId: string;
  dateStart: string;
  dateEnd: string;
}

export const getMonitorLocations: UMElasticsearchQueryFn<
  GetMonitorLocationsParams,
  MonitorLocations
> = async ({ callES, dynamicSettings, monitorId, dateStart, dateEnd }) => {
  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              match: {
                'monitor.id': monitorId,
              },
            },
            {
              exists: {
                field: 'summary',
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: dateStart,
                  lte: dateEnd,
                },
              },
            },
          ],
        },
      },
      aggs: {
        location: {
          terms: {
            field: 'observer.geo.name',
            missing: '__location_missing__',
          },
          aggs: {
            most_recent: {
              top_hits: {
                size: 1,
                sort: {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
                _source: ['monitor', 'summary', 'observer', '@timestamp'],
              },
            },
          },
        },
      },
    },
  };

  const result = await callES('search', params);
  const locations = result?.aggregations?.location?.buckets ?? [];

  const getGeo = (locGeo: { name: string; location?: string }) => {
    if (locGeo) {
      const { name, location } = locGeo;
      const latLon = location?.trim().split(',');
      return {
        name,
        location: latLon
          ? {
              lat: latLon[0],
              lon: latLon[1],
            }
          : undefined,
      };
    } else {
      return {
        name: UNNAMED_LOCATION,
      };
    }
  };

  const monLocs: MonitorLocation[] = [];
  locations.forEach((loc: any) => {
    const mostRecentLocation = loc.most_recent.hits.hits[0]._source;
    const location: MonitorLocation = {
      summary: mostRecentLocation?.summary,
      geo: getGeo(mostRecentLocation?.observer?.geo),
      timestamp: mostRecentLocation['@timestamp'],
    };
    monLocs.push(location);
  });

  return {
    monitorId,
    locations: monLocs,
  };
};
