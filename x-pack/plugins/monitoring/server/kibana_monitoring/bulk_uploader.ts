/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import moment from 'moment';
import type {
  ElasticsearchClient,
  Logger,
  OpsMetrics,
  ServiceStatus,
  ServiceStatusLevel,
} from 'src/core/server';
import { ServiceStatusLevels } from '../../../../../src/core/server';
import { KIBANA_STATS_TYPE_MONITORING, KIBANA_SETTINGS_TYPE } from '../../common/constants';

import { sendBulkPayload } from './lib';
import { getKibanaSettings } from './collectors';
import type { MonitoringConfig } from '../config';
import type { IBulkUploader } from '../types';

export interface BulkUploaderOptions {
  log: Logger;
  config: MonitoringConfig;
  interval: number;
  statusGetter$: Observable<ServiceStatus>;
  opsMetrics$: Observable<OpsMetrics>;
  kibanaStats: KibanaStats;
}

export interface KibanaStats {
  uuid: string;
  name: string;
  index: string;
  host: string;
  locale: string;
  port: string;
  transport_address: string;
  version: string;
  snapshot: boolean;
}

/*
 * Handles internal Kibana stats collection and uploading data to Monitoring
 * bulk endpoint.
 *
 * NOTE: internal collection will be removed in 7.0
 *
 * Depends on
 *   - 'monitoring.kibana.collection.enabled' config
 *   - monitoring enabled in ES (checked against xpack_main.info license info change)
 * The dependencies are handled upstream
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} server HapiJS server instance
 * @param {Object} xpackInfo server.plugins.xpack_main.info object
 */
export class BulkUploader implements IBulkUploader {
  private readonly _log: Logger;
  private readonly kibanaStats: KibanaStats;
  private readonly kibanaStatusGetter$: Observable<ServiceStatus>;
  private kibanaStatusSubscription?: Subscription;
  private readonly opsMetrics$: Observable<OpsMetrics>;
  private kibanaStatus: ServiceStatusLevel | null;
  private _timer: NodeJS.Timer | null;
  private readonly _interval: number;
  private readonly config: MonitoringConfig;
  constructor({
    log,
    config,
    interval,
    statusGetter$,
    opsMetrics$,
    kibanaStats,
  }: BulkUploaderOptions) {
    if (typeof interval !== 'number') {
      throw new Error('interval number of milliseconds is required');
    }

    this.opsMetrics$ = opsMetrics$;
    this.config = config;

    this._timer = null;
    this._interval = interval;
    this._log = log;

    this.kibanaStats = kibanaStats;

    this.kibanaStatus = null;
    this.kibanaStatusGetter$ = statusGetter$;
  }

  /*
   * Start the interval timer
   * @param {usageCollection} usageCollection object to use for initial the fetch/upload and fetch/uploading on interval
   * @return undefined
   */
  public start(esClient: ElasticsearchClient) {
    this._log.info('Starting monitoring stats collection');

    this.kibanaStatusSubscription = this.kibanaStatusGetter$.subscribe((nextStatus) => {
      this.kibanaStatus = nextStatus.level;
    });

    if (this._timer) {
      clearInterval(this._timer);
    } else {
      this._fetchAndUpload(esClient); // initial fetch
    }

    this._timer = setInterval(() => {
      this._fetchAndUpload(esClient);
    }, this._interval);
  }

  /*
   * start() and stop() are lifecycle event handlers for
   * xpackMainPlugin license changes
   * @param {String} logPrefix help give context to the reason for stopping
   */
  public stop(logPrefix?: string) {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;

    this.kibanaStatusSubscription?.unsubscribe();

    const prefix = logPrefix ? logPrefix + ':' : '';
    this._log.info(prefix + 'Monitoring stats collection is stopped');
  }

  public handleNotEnabled() {
    this.stop('Monitoring status upload endpoint is not enabled in Elasticsearch');
  }
  public handleConnectionLost() {
    this.stop('Connection issue detected');
  }

  /**
   * Retrieves the OpsMetrics in the same format as the `kibana_stats` collector
   * @private
   */
  private async getOpsMetrics() {
    const {
      process: { pid, ...process },
      collected_at: collectedAt,
      requests: { statusCodes, ...requests },
      ...lastMetrics
    } = await this.opsMetrics$.pipe(take(1)).toPromise();
    return {
      ...lastMetrics,
      process,
      requests,
      response_times: {
        average: lastMetrics.response_times.avg_in_millis,
        max: lastMetrics.response_times.max_in_millis,
      },
      timestamp: moment.utc(collectedAt).toISOString(),
    };
  }

  private async _fetchAndUpload(esClient: ElasticsearchClient) {
    const data = await Promise.all([
      { type: KIBANA_STATS_TYPE_MONITORING, result: await this.getOpsMetrics() },
      { type: KIBANA_SETTINGS_TYPE, result: await getKibanaSettings(this._log, this.config) },
    ]);

    const payload = this.toBulkUploadFormat(data);
    if (payload && payload.length > 0) {
      try {
        this._log.debug(`Uploading bulk stats payload to the local cluster`);
        await this._onPayload(esClient, payload);
        this._log.debug(`Uploaded bulk stats payload to the local cluster`);
      } catch (err) {
        this._log.warn(err.stack);
        this._log.warn(`Unable to bulk upload the stats payload to the local cluster`);
      }
    } else {
      this._log.debug(`Skipping bulk uploading of an empty stats payload`);
    }
  }

  private async _onPayload(esClient: ElasticsearchClient, payload: object[]) {
    return await sendBulkPayload(esClient, this._interval, payload);
  }

  private getConvertedKibanaStatus() {
    if (this.kibanaStatus === ServiceStatusLevels.available) {
      return 'green';
    }
    if (this.kibanaStatus === ServiceStatusLevels.critical) {
      return 'red';
    }
    if (this.kibanaStatus === ServiceStatusLevels.degraded) {
      return 'yellow';
    }
    return 'unknown';
  }

  public getKibanaStats(type?: string) {
    const stats = {
      ...this.kibanaStats,
      status: this.getConvertedKibanaStatus(),
    };

    if (type === KIBANA_STATS_TYPE_MONITORING) {
      // Do not report the keys `port` and `locale`
      const { port, locale, ...rest } = stats;
      return rest;
    }

    return stats;
  }

  /*
   * Bulk stats are transformed into a bulk upload format
   * Non-legacy transformation is done in CollectorSet.toApiStats
   *
   * Example:
   * Before:
   *    [
   *      {
   *        "type": "kibana_stats",
   *        "result": {
   *          "process": { ...  },
   *          "requests": { ...  },
   *          ...
   *        }
   *      },
   *    ]
   *
   * After:
   *    [
   *      {
   *        "index": {
   *          "_type": "kibana_stats"
   *        }
   *      },
   *      {
   *        "kibana": {
   *          "host": "localhost",
   *          "uuid": "d619c5d1-4315-4f35-b69d-a3ac805489fb",
   *          "version": "7.0.0-alpha1",
   *          ...
   *        },
   *        "process": { ...  },
   *        "requests": { ...  },
   *        ...
   *      }
   *    ]
   */
  private toBulkUploadFormat(rawData: Array<{ type: string; result: any }>) {
    // convert the raw data into a flat array, with each payload prefixed
    // with an 'index' instruction, for bulk upload
    return rawData.reduce((accum, { type, result }) => {
      return [
        ...accum,
        { index: { _type: type } },
        {
          kibana: this.getKibanaStats(type),
          ...result,
        },
      ];
    }, [] as object[]);
  }
}
