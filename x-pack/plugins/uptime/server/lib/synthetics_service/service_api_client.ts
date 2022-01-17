/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { forkJoin, from as rxjsFrom, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as https from 'https';
import { SslConfig } from '@kbn/server-http-tools';
import { getServiceLocations } from './get_service_locations';
import { Logger } from '../../../../../../src/core/server';
import { MonitorFields, ServiceLocations } from '../../../common/runtime_types';
import { convertToDataStreamFormat } from './formatters/convert_to_data_stream';
import { ServiceConfig } from '../../../common/config';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export interface ServiceData {
  monitors: Array<Partial<MonitorFields>>;
  output: {
    hosts: string[];
    api_key: string;
  };
}

export class ServiceAPIClient {
  private readonly username?: string;
  private readonly devUrl?: string;
  private readonly authorization: string;
  private locations: ServiceLocations;
  private logger: Logger;
  private readonly config: ServiceConfig;

  constructor(logger: Logger, config: ServiceConfig) {
    this.config = config;
    const { username, password, manifestUrl, devUrl } = config;
    this.username = username;
    this.devUrl = devUrl;

    if (username && password) {
      this.authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    } else {
      this.authorization = '';
    }

    this.logger = logger;
    this.locations = [];

    getServiceLocations({ manifestUrl }).then((result) => {
      this.locations = result.locations;
    });
  }

  getHttpsAgent() {
    const config = this.config;
    if (config.tls && config.tls.certificate && config.tls.key) {
      const tlsConfig = new SslConfig(config.tls);

      return new https.Agent({
        rejectUnauthorized: true, // (NOTE: this will disable client verification)
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      });
    }
  }

  async post(data: ServiceData) {
    return this.callAPI('POST', data);
  }

  async put(data: ServiceData) {
    return this.callAPI('POST', data);
  }

  async delete(data: ServiceData) {
    return this.callAPI('DELETE', data);
  }

  async callAPI(method: 'POST' | 'PUT' | 'DELETE', { monitors: allMonitors, output }: ServiceData) {
    if (this.username === TEST_SERVICE_USERNAME) {
      // we don't want to call service while local integration tests are running
      return;
    }

    const callServiceEndpoint = (monitors: ServiceData['monitors'], url: string) => {
      // don't need to pass locations to heartbeat
      const monitorsStreams = monitors.map(({ locations, ...rest }) =>
        convertToDataStreamFormat(rest)
      );

      return axios({
        method,
        url: (this.devUrl ?? url) + '/monitors',
        data: { monitors: monitorsStreams, output },
        headers: this.authorization
          ? {
              Authorization: this.authorization,
            }
          : undefined,
        httpsAgent: this.getHttpsAgent(),
      });
    };

    const pushErrors: Array<{ locationId: string; error: Error }> = [];

    const promises: Array<Observable<unknown>> = [];

    this.locations.forEach(({ id, url }) => {
      const locMonitors = allMonitors.filter(
        ({ locations }) =>
          !locations || locations.length === 0 || locations?.find((loc) => loc.id === id)
      );
      if (locMonitors.length > 0) {
        promises.push(
          rxjsFrom(callServiceEndpoint(locMonitors, url)).pipe(
            tap((result) => {
              this.logger.debug(result.data);
            }),
            catchError((err) => {
              pushErrors.push({ locationId: id, error: err });
              this.logger.error(err);
              // we don't want to throw an unhandled exception here
              return of(true);
            })
          )
        );
      }
    });

    await forkJoin(promises).toPromise();

    return pushErrors;
  }
}
