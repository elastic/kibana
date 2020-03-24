/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { INDEX_NAMES } from '../../../../../../legacy/plugins/uptime/common/constants';
import { PageViewParams, UptimeTelemetry } from './types';
import { UptimePage } from '../../../../../../legacy/plugins/uptime/public/hooks';

interface UptimeTelemetryCollector {
  [key: number]: UptimeTelemetry;
}

// seconds in an hour
const BUCKET_SIZE = 3600;
// take buckets in the last day
const BUCKET_NUMBER = 24;

export class KibanaTelemetryAdapter {
  public static registerUsageCollector = (usageCollector: UsageCollectionSetup) => {
    const collector = KibanaTelemetryAdapter.initUsageCollector(usageCollector);
    usageCollector.registerCollector(collector);
  };

  public static initUsageCollector(usageCollector: UsageCollectionSetup) {
    return usageCollector.makeUsageCollector({
      type: 'uptime',
      fetch: async (callCluster: APICluster) => {
        this.countNoOfUniqueMonitorAndLocations(callCluster);
        const report = this.getReport();
        return { last_24_hours: { hits: { ...report } } };
      },
      isReady: () => true,
    });
  }

  public static countPageView(pageView: PageViewParams) {
    const bucket = this.getBucketToIncrement();

    switch (pageView.page) {
      case UptimePage.Overview:
        this.collector[bucket].overview_page += 1;
        break;
      case UptimePage.Monitor:
        this.collector[bucket].monitor_page += 1;
        break;
      case UptimePage.Settings:
        this.collector[bucket].settings_page += 1;
        break;
    }
  }

  public static async countNoOfUniqueMonitorAndLocations(callCluster: APICluster) {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
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
              size: 10000,
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
    const monitorName: any = result?.aggregations?.monitor_name;
    const locationName: any = result?.aggregations?.observer_loc_name;
    const uniqueMonitors: any = result?.aggregations?.monitors.buckets;
    const bucket = this.getBucketToIncrement();

    this.collector[bucket].no_of_unique_monitors = numberOfUniqueMonitors;
    this.collector[bucket].no_of_unique_observer_locations = numberOfUniqueLocations;
    this.collector[bucket].no_of_unique_observer_locations = numberOfUniqueLocations;
    this.collector[bucket].monitor_name_stats = {
      min_length: monitorName.min_length,
      max_length: monitorName.max_length,
      avg_length: +monitorName.avg_length.toFixed(2),
    };

    this.collector[bucket].observer_location_name_stats = {
      min_length: locationName.min_length,
      max_length: locationName.max_length,
      avg_length: +locationName.avg_length.toFixed(2),
    };

    this.collector[bucket].monitor_frequency = this.getMonitorsFrequency(uniqueMonitors);
  }

  private static getMonitorsFrequency(uniqueMonitors = []) {
    const frequencies: number[] = [];
    uniqueMonitors
      .map(item => item.docs.hits.hits[0])
      .forEach(monitor => {
        const timespan = monitor._source.monitor.timespan;
        const timeDiffSec = (moment(timespan.lt) - moment(timespan.gte)) / 1000;
        frequencies.push(timeDiffSec);
      });
    return frequencies;
  }

  private static collector: UptimeTelemetryCollector = {};

  private static getReport() {
    const minBucket = this.getCollectorWindow();
    Object.keys(this.collector)
      .map(key => parseInt(key, 10))
      .filter(key => key < minBucket)
      .forEach(oldBucket => {
        delete this.collector[oldBucket];
      });

    return Object.values(this.collector).reduce(
      (acc, cum) => ({
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
        setting_page: 0,
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
      };
    }
    return bucketId;
  }

  private static getCollectorWindow() {
    return this.getBucket() - BUCKET_SIZE * (BUCKET_NUMBER - 1);
  }
}
