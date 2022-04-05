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
import { Logger } from '../../../../../../src/core/server';
import {
  MonitorFields,
  ServiceLocations,
  ServiceLocationErrors,
} from '../../../common/runtime_types';
import { convertToDataStreamFormat } from './formatters/convert_to_data_stream';
import { ServiceConfig } from '../../../common/config';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export interface ServiceData {
  monitors: Array<Partial<MonitorFields>>;
  output: {
    hosts: string[];
    api_key: string;
  };
  runOnce?: boolean;
}

export class ServiceAPIClient {
  private readonly username?: string;
  private readonly authorization: string;
  public locations: ServiceLocations;
  private logger: Logger;
  private readonly config: ServiceConfig;
  private readonly kibanaVersion: string;

  constructor(logger: Logger, config: ServiceConfig, kibanaVersion: string) {
    this.config = config;
    const { username, password } = config;
    this.username = username;
    this.kibanaVersion = kibanaVersion;

    if (username && password) {
      this.authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    } else {
      this.authorization = '';
    }

    this.logger = logger;
    this.locations = [];
  }

  getHttpsAgent() {
    const config = this.config;
    if (config.tls && config.tls.certificate && config.tls.key) {
      const tlsConfig = new SslConfig(config.tls);

      const rejectUnauthorized = process.env.NODE_ENV === 'production';

      return new https.Agent({
        rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      });
    }
  }

  async post(data: ServiceData) {
    return this.callAPI('POST', data);
  }

  async put(data: ServiceData) {
    return this.callAPI('PUT', data);
  }

  async delete(data: ServiceData) {
    return this.callAPI('DELETE', data);
  }

  async runOnce(data: ServiceData) {
    return this.callAPI('POST', { ...data, runOnce: true });
  }

  async checkAccountAccessStatus() {
    if (this.authorization) {
      // in case username/password is provided, we assume it's always allowed
      return { allowed: true, signupUrl: null };
    }

    const httpsAgent = this.getHttpsAgent();

    if (this.locations.length > 0 && httpsAgent) {
      // get a url from a random location
      const url = this.locations[Math.floor(Math.random() * this.locations.length)].url;

      try {
        const { data } = await axios({
          method: 'GET',
          url: url + '/allowed',
          headers:
            process.env.NODE_ENV !== 'production' && this.authorization
              ? {
                  Authorization: this.authorization,
                }
              : undefined,
          httpsAgent,
        });

        const { allowed, signupUrl } = data;
        return { allowed, signupUrl };
      } catch (e) {
        this.logger.error(e);
      }
    }

    return { allowed: false, signupUrl: null };
  }

  async callAPI(
    method: 'POST' | 'PUT' | 'DELETE',
    { monitors: allMonitors, output, runOnce }: ServiceData
  ) {
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
        url: url + (runOnce ? '/run' : '/monitors'),
        data: { monitors: monitorsStreams, output, stack_version: this.kibanaVersion },
        headers:
          process.env.NODE_ENV !== 'production' && this.authorization
            ? {
                Authorization: this.authorization,
              }
            : undefined,
        httpsAgent: this.getHttpsAgent(),
      });
    };

    const pushErrors: ServiceLocationErrors = [];

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
              this.logger.debug(
                `Successfully called service with method ${method} with ${allMonitors.length} monitors `
              );
            }),
            catchError((err) => {
              pushErrors.push({ locationId: id, error: err.response?.data });
              this.logger.error(err);
              if (err.response?.data?.reason) {
                this.logger.error(err.response?.data?.reason);
              }
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
