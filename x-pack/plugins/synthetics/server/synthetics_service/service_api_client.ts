/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { forkJoin, from as rxjsFrom, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as https from 'https';
import { SslConfig } from '@kbn/server-http-tools';
import { Logger } from '@kbn/core/server';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { MonitorFields, PublicLocations, ServiceLocationErrors } from '../../common/runtime_types';
import { convertToDataStreamFormat } from './formatters/convert_to_data_stream';
import { ServiceConfig } from '../../common/config';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export interface ServiceData {
  monitors: Array<Partial<MonitorFields>>;
  output: {
    hosts: string[];
    api_key: string;
  };
  runOnce?: boolean;
  isEdit?: boolean;
}

export class ServiceAPIClient {
  private readonly username?: string;
  private readonly authorization: string;
  public locations: PublicLocations;
  private logger: Logger;
  private readonly config?: ServiceConfig;
  private readonly stackVersion: string;
  private readonly server: UptimeServerSetup;

  constructor(logger: Logger, config: ServiceConfig, server: UptimeServerSetup) {
    this.config = config;
    const { username, password } = config ?? {};
    this.username = username;
    this.stackVersion = server.stackVersion;

    if (username && password) {
      this.authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    } else {
      this.authorization = '';
    }

    this.logger = logger;
    this.locations = [];
    this.server = server;
  }

  getHttpsAgent(targetUrl: string) {
    const parsedTargetUrl = new URL(targetUrl);

    const rejectUnauthorized = parsedTargetUrl.hostname !== 'localhost' || !this.server.isDev;
    const baseHttpsAgent = new https.Agent({ rejectUnauthorized });

    const config = this.config ?? {};

    // If using basic-auth, ignore certificate configs
    if (this.authorization) return baseHttpsAgent;

    if (config.tls && config.tls.certificate && config.tls.key) {
      const tlsConfig = new SslConfig(config.tls);

      return new https.Agent({
        rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      });
    }

    return baseHttpsAgent;
  }

  async post(data: ServiceData) {
    return this.callAPI('PUT', data);
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

  addVersionHeader(req: AxiosRequestConfig) {
    req.headers = { ...req.headers, 'x-kibana-version': this.stackVersion };
    return req;
  }

  async checkAccountAccessStatus() {
    if (this.authorization) {
      // in case username/password is provided, we assume it's always allowed
      return { allowed: true, signupUrl: null };
    }

    if (this.locations.length > 0) {
      // get a url from a random location
      const url = this.locations[Math.floor(Math.random() * this.locations.length)].url;

      /* url is required for service locations, but omitted for private locations.
      /* this.locations is only service locations */
      const httpsAgent = this.getHttpsAgent(url);

      if (httpsAgent) {
        try {
          const { data } = await axios(
            this.addVersionHeader({
              method: 'GET',
              url: url + '/allowed',
              httpsAgent,
            })
          );

          const { allowed, signupUrl } = data;
          return { allowed, signupUrl };
        } catch (e) {
          this.logger.error(e);
        }
      }
    }

    return { allowed: false, signupUrl: null };
  }

  async callAPI(
    method: 'POST' | 'PUT' | 'DELETE',
    { monitors: allMonitors, output, runOnce, isEdit }: ServiceData
  ) {
    console.log(JSON.stringify(this.locations));
    if (this.username === TEST_SERVICE_USERNAME) {
      // we don't want to call service while local integration tests are running
      return;
    }

    const callServiceEndpoint = (monitors: ServiceData['monitors'], url: string) => {
      // don't need to pass locations to heartbeat
      const monitorsStreams = monitors.map(({ locations, ...rest }) =>
        convertToDataStreamFormat(rest)
      );

      return axios(
        this.addVersionHeader({
          method,
          url: url + (runOnce ? '/run' : '/monitors'),
          data: {
            monitors: monitorsStreams,
            output,
            stack_version: this.stackVersion,
            is_edit: isEdit,
          },
          headers: this.authorization
            ? {
                Authorization: this.authorization,
              }
            : undefined,
          httpsAgent: this.getHttpsAgent(url),
        })
      );
    };

    const pushErrors: ServiceLocationErrors = [];

    const promises: Array<Observable<unknown>> = [];

    this.locations.forEach(({ id, url }) => {
      const locMonitors = allMonitors.filter(({ locations }) =>
        locations?.find((loc) => loc.id === id && loc.isServiceManaged)
      );
      if (locMonitors.length > 0) {
        promises.push(
          rxjsFrom(callServiceEndpoint(locMonitors, url)).pipe(
            tap((result) => {
              this.logger.debug(result.data);
              this.logger.debug(
                `Successfully called service location ${url} with method ${method} with ${locMonitors.length} monitors `
              );
            }),
            catchError((err: AxiosError<{ reason: string; status: number }>) => {
              pushErrors.push({ locationId: id, error: err.response?.data! });
              const reason = err.response?.data?.reason ?? '';

              err.message = `Failed to call service location ${url} with method ${method} with ${locMonitors.length} monitors:  ${err.message}, ${reason}`;
              this.logger.error(err);
              sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
                reason: err.response?.data?.reason,
                message: err.message,
                type: 'syncError',
                code: err.code,
                status: err.response?.data?.status,
                url,
                stackVersion: this.server.stackVersion,
              });
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
