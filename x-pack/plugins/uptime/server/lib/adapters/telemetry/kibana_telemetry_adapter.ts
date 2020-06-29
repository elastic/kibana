/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ISavedObjectsRepository, SavedObjectsClientContract } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PageViewParams, UptimeTelemetry, Usage } from './types';
import { APICaller } from '../framework';
import { savedObjectsAdapter } from '../../saved_objects';

interface UptimeTelemetryCollector {
  [key: number]: UptimeTelemetry;
}

// seconds in an hour
const BUCKET_SIZE = 3600;
// take buckets in the last day
const BUCKET_NUMBER = 24;

export class KibanaTelemetryAdapter {
  public static registerUsageCollector = (
    usageCollector: UsageCollectionSetup,
    getSavedObjectsClient: () => ISavedObjectsRepository | undefined
  ) => {
    if (!usageCollector) {
      return;
    }
    const collector = KibanaTelemetryAdapter.initUsageCollector(
      usageCollector,
      getSavedObjectsClient
    );
    usageCollector.registerCollector(collector);
  };

  public static initUsageCollector(
    usageCollector: UsageCollectionSetup,
    getSavedObjectsClient: () => ISavedObjectsRepository | undefined
  ) {
    return usageCollector.makeUsageCollector<Usage>({
      type: 'uptime',
      schema: {
        last_24_hours: {
          hits: {
            autoRefreshEnabled: {
              type: 'boolean',
            },
            autorefreshInterval: { type: 'long' },
            dateRangeEnd: { type: 'date' },
            dateRangeStart: { type: 'date' },
            monitor_frequency: { type: 'long' },
            monitor_name_stats: {
              avg_length: { type: 'float' },
              max_length: { type: 'long' },
              min_length: { type: 'long' },
            },
            monitor_page: { type: 'long' },
            no_of_unique_monitors: { type: 'long' },
            no_of_unique_observer_locations: { type: 'long' },
            observer_location_name_stats: {
              avg_length: { type: 'float' },
              max_length: { type: 'long' },
              min_length: { type: 'long' },
            },
            overview_page: { type: 'long' },
            settings_page: { type: 'long' },
          },
        },
      },
      fetch: async (callCluster: APICaller) => {
        const savedObjectsClient = getSavedObjectsClient()!;
        if (savedObjectsClient) {
          await this.countNoOfUniqueMonitorAndLocations(callCluster, savedObjectsClient);
        }
        const report = this.getReport();
        return { last_24_hours: { hits: { ...report } } };
      },
      isReady: () => typeof getSavedObjectsClient() !== 'undefined',
    });
  }

  public static clearLocalTelemetry() {
    this.collector = {};
  }

  public static countPageView(pageView: PageViewParams) {
    const bucketId = this.getBucketToIncrement();
    const bucket = this.collector[bucketId];
    if (pageView.page === 'Overview') {
      bucket.overview_page += 1;
    }
    if (pageView.page === 'Monitor') {
      bucket.monitor_page += 1;
    }
    if (pageView.page === 'Settings') {
      bucket.settings_page += 1;
    }
    this.updateDateData(pageView, bucket);
    return bucket;
  }

  public static updateDateData(
    { dateStart, dateEnd, autoRefreshEnabled, autorefreshInterval }: PageViewParams,
    bucket: UptimeTelemetry
  ) {
    const prevDateStart = [...bucket.dateRangeStart].pop();
    if (!prevDateStart || prevDateStart !== dateStart) {
      bucket.dateRangeStart.push(dateStart);
      bucket.dateRangeEnd.push(dateEnd);
    } else {
      const prevDateEnd = [...bucket.dateRangeEnd].pop();
      if (!prevDateEnd || prevDateEnd !== dateEnd) {
        bucket.dateRangeStart.push(dateStart);
        bucket.dateRangeEnd.push(dateEnd);
      }
    }

    const prevAutorefreshInterval = [...bucket.autorefreshInterval].pop();
    if (!prevAutorefreshInterval || prevAutorefreshInterval !== autorefreshInterval) {
      bucket.autorefreshInterval.push(autorefreshInterval);
    }
    bucket.autoRefreshEnabled = autoRefreshEnabled;
  }

  public static async countNoOfUniqueMonitorAndLocations(
    callCluster: APICaller,
    savedObjectsClient: ISavedObjectsRepository | SavedObjectsClientContract
  ) {
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);
    const params = {
      index: dynamicSettings.heartbeatIndices,
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1d/d',
                    lt: 'now',
                  },
                },
              },
            ],
          },
        },
        size: 0,
        aggs: {
          unique_monitors: {
            cardinality: {
              field: 'monitor.id',
            },
          },
          unique_locations: {
            cardinality: {
              field: 'observer.geo.name',
              missing: 'N/A',
            },
          },
          monitor_name: {
            string_stats: {
              field: 'monitor.name',
            },
          },
          observer_loc_name: {
            string_stats: {
              field: 'observer.geo.name',
            },
          },
          monitors: {
            terms: {
              field: 'monitor.id',
              size: 1000,
            },
            aggs: {
              docs: {
                top_hits: {
                  size: 1,
                  _source: ['monitor.timespan'],
                },
              },
            },
          },
        },
      },
    };

    const result = await callCluster('search', params);
    const numberOfUniqueMonitors: number = result?.aggregations?.unique_monitors?.value ?? 0;
    const numberOfUniqueLocations: number = result?.aggregations?.unique_locations?.value ?? 0;
    const monitorNameStats: any = result?.aggregations?.monitor_name;
    const locationNameStats: any = result?.aggregations?.observer_loc_name;
    const uniqueMonitors: any = result?.aggregations?.monitors.buckets;

    const bucketId = this.getBucketToIncrement();
    const bucket = this.collector[bucketId];

    bucket.no_of_unique_monitors = numberOfUniqueMonitors;
    bucket.no_of_unique_observer_locations = numberOfUniqueLocations;
    bucket.no_of_unique_observer_locations = numberOfUniqueLocations;
    bucket.monitor_name_stats = {
      min_length: monitorNameStats?.min_length ?? 0,
      max_length: monitorNameStats?.max_length ?? 0,
      avg_length: +(monitorNameStats?.avg_length?.toFixed(2) ?? 0),
    };

    bucket.observer_location_name_stats = {
      min_length: locationNameStats?.min_length ?? 0,
      max_length: locationNameStats?.max_length ?? 0,
      avg_length: +(locationNameStats?.avg_length?.toFixed(2) ?? 0),
    };

    bucket.monitor_frequency = this.getMonitorsFrequency(uniqueMonitors);
    return bucket;
  }

  private static getMonitorsFrequency(uniqueMonitors = []) {
    const frequencies: number[] = [];
    uniqueMonitors
      .map((item: any) => item!.docs.hits?.hits?.[0] ?? {})
      .forEach((monitor) => {
        const timespan = monitor?._source?.monitor?.timespan;
        if (timespan) {
          const timeDiffSec = moment
            .duration(moment(timespan.lt).diff(moment(timespan.gte)))
            .asSeconds();
          frequencies.push(timeDiffSec);
        }
      });
    return frequencies;
  }

  private static collector: UptimeTelemetryCollector = {};

  private static getReport() {
    const minBucket = this.getCollectorWindow();
    Object.keys(this.collector)
      .map((key) => parseInt(key, 10))
      .filter((key) => key < minBucket)
      .forEach((oldBucket) => {
        delete this.collector[oldBucket];
      });

    return Object.values(this.collector).reduce(
      (acc, cum) => ({
        ...cum,
        overview_page: acc.overview_page + cum.overview_page,
        monitor_page: acc.monitor_page + cum.monitor_page,
        settings_page: acc.settings_page + cum.settings_page,
      }),
      { overview_page: 0, monitor_page: 0, settings_page: 0 }
    );
  }

  private static getBucket() {
    const nowInSeconds = Math.round(Date.now() / 1000);
    return nowInSeconds - (nowInSeconds % BUCKET_SIZE);
  }

  private static getBucketToIncrement() {
    const bucketId = this.getBucket();
    if (!this.collector[bucketId]) {
      this.collector[bucketId] = {
        overview_page: 0,
        monitor_page: 0,
        no_of_unique_monitors: 0,
        settings_page: 0,
        monitor_frequency: [],
        monitor_name_stats: {
          min_length: 0,
          max_length: 0,
          avg_length: 0,
        },
        no_of_unique_observer_locations: 0,
        observer_location_name_stats: {
          min_length: 0,
          max_length: 0,
          avg_length: 0,
        },
        dateRangeStart: [],
        dateRangeEnd: [],
        autoRefreshEnabled: false,
        autorefreshInterval: [],
      };
    }
    return bucketId;
  }

  private static getCollectorWindow() {
    return this.getBucket() - BUCKET_SIZE * (BUCKET_NUMBER - 1);
  }
}
