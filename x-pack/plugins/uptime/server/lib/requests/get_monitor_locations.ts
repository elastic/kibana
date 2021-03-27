/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
> = async ({ uptimeEsClient, monitorId, dateStart, dateEnd }) => {
  const sortOptions = [
    {
      '@timestamp': {
        order: 'desc' as const,
      },
    },
  ];

  const params = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
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
              sort: sortOptions,
              _source: ['monitor', 'summary', 'observer', '@timestamp'],
            },
          },
          down_history: {
            sum: {
              field: 'summary.down',
              missing: 0,
            },
          },
          up_history: {
            sum: {
              field: 'summary.up',
              missing: 0,
            },
          },
        },
      },
    },
  };

  const { body: result } = await uptimeEsClient.search({ body: params });

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

  let totalUps = 0;
  let totalDowns = 0;

  const monLocs: MonitorLocation[] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  locations.forEach(({ most_recent: mostRecent, up_history, down_history }: any) => {
    const mostRecentLocation = mostRecent.hits.hits[0]._source;
    totalUps += up_history.value;
    totalDowns += down_history.value;
    const location: MonitorLocation = {
      up_history: up_history.value ?? 0,
      down_history: down_history.value ?? 0,
      summary: mostRecentLocation?.summary,
      geo: getGeo(mostRecentLocation?.observer?.geo),
      timestamp: mostRecentLocation['@timestamp'],
    };
    monLocs.push(location);
  });

  return {
    monitorId,
    locations: monLocs,
    up_history: totalUps,
    down_history: totalDowns,
  };
};
