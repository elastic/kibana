/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { forkJoin, from as rxjsFrom, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs';
import * as https from 'https';
import { SslConfig } from '@kbn/server-http-tools';
import { Logger } from '@kbn/core/server';
import { LicenseGetLicenseInformation } from '@elastic/elasticsearch/lib/api/types';
import { SyntheticsServerSetup } from '../types';
import {
  convertToDataStreamFormat,
  DataStreamConfig,
} from './formatters/public_formatters/convert_to_data_stream';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import {
  MonitorFields,
  PublicLocations,
  ServiceLocation,
  ServiceLocationErrors,
} from '../../common/runtime_types';
import { ServiceConfig } from '../config';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export interface ServiceData {
  monitors: Array<Partial<MonitorFields>>;
  output: {
    hosts: string[];
    api_key: string;
  };
  endpoint?: 'monitors' | 'runOnce' | 'sync';
  isEdit?: boolean;
  license: LicenseGetLicenseInformation;
  location?: ServiceLocation;
}

export interface ServicePayload {
  monitors: DataStreamConfig[];
  output: {
    hosts: string[];
    api_key: string;
  };
  stack_version: string;
  is_edit?: boolean;
  license_level: string;
  license_issued_to: string;
  deployment_id?: string;
  cloud_id?: string;
}

export class ServiceAPIClient {
  private readonly username?: string;
  private readonly authorization: string;
  public locations: PublicLocations;
  private logger: Logger;
  private readonly config?: ServiceConfig;
  private readonly stackVersion: string;
  private readonly server: SyntheticsServerSetup;

  constructor(logger: Logger, config: ServiceConfig, server: SyntheticsServerSetup) {
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

  addVersionHeader(req: AxiosRequestConfig) {
    req.headers = { ...req.headers, 'x-kibana-version': this.stackVersion };
    return req;
  }

  async checkAccountAccessStatus() {
    if (this.authorization || !this.config?.manifestUrl) {
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
    } else {
      this.logger.debug(
        'Failed to fetch isAllowed status. Locations were not fetched from manifest.'
      );
    }

    return { allowed: false, signupUrl: null };
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

  async inspect(data: ServiceData) {
    const monitorsByLocation = this.processServiceData(data);

    return monitorsByLocation.map(({ data: payload }) => payload);
  }

  async post(data: ServiceData) {
    return (await this.callAPI('POST', data)).pushErrors;
  }

  async put(data: ServiceData) {
    return (await this.callAPI('PUT', data)).pushErrors;
  }

  async delete(data: ServiceData) {
    return (await this.callAPI('DELETE', data)).pushErrors;
  }

  async runOnce(data: ServiceData) {
    return (await this.callAPI('POST', { ...data, endpoint: 'runOnce' })).pushErrors;
  }

  async syncMonitors(data: ServiceData) {
    try {
      return (await this.callAPI('PUT', { ...data, endpoint: 'sync' })).pushErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  processServiceData({ monitors, location, ...restOfData }: ServiceData) {
    // group monitors by location
    const monitorsByLocation: Array<{
      location: { id: string; url: string };
      monitors: ServiceData['monitors'];
      data: ServicePayload;
    }> = [];
    this.locations.forEach(({ id, url }) => {
      if (!location || location.id === id) {
        const locMonitors = monitors.filter(({ locations }) =>
          locations?.find((loc) => loc.id === id && loc.isServiceManaged)
        );
        if (locMonitors.length > 0) {
          const data = this.getRequestData({ ...restOfData, monitors: locMonitors });
          monitorsByLocation.push({ location: { id, url }, monitors: locMonitors, data });
        }
      }
    });
    return monitorsByLocation;
  }

  async callAPI(method: 'POST' | 'PUT' | 'DELETE', serviceData: ServiceData) {
    const { endpoint } = serviceData;
    if (this.username === TEST_SERVICE_USERNAME) {
      // we don't want to call service while local integration tests are running
      return { result: [] as ServicePayload[], pushErrors: [] };
    }

    const pushErrors: ServiceLocationErrors = [];
    const promises: Array<Observable<unknown>> = [];

    const monitorsByLocation = this.processServiceData(serviceData);

    monitorsByLocation.forEach(({ location: { url, id }, monitors, data }) => {
      const promise = this.callServiceEndpoint(data, method, url, endpoint);
      promises.push(
        rxjsFrom(promise).pipe(
          tap((result) => {
            this.logSuccessMessage(url, method, monitors.length, result);
          }),
          catchError((err: AxiosError<{ reason: string; status: number }>) => {
            pushErrors.push({ locationId: id, error: err.response?.data! });
            this.logServiceError(err, url, method, monitors.length);
            // we don't want to throw an unhandled exception here
            return of(true);
          })
        )
      );
    });

    const result = await forkJoin(promises).toPromise();

    return { pushErrors, result };
  }

  async callServiceEndpoint(
    data: ServicePayload,
    // INSPECT is a special case where we don't want to call the service, but just return the data
    method: 'POST' | 'PUT' | 'DELETE',
    baseUrl: string,
    endpoint: string = 'monitors'
  ) {
    let url = baseUrl;
    switch (endpoint) {
      case 'monitors':
        url += '/monitors';
        break;
      case 'runOnce':
        url += '/run';
        break;
      case 'sync':
        url += '/monitors/sync';
        break;
    }

    const authHeader = this.authorization ? { Authorization: this.authorization } : undefined;

    return axios(
      this.addVersionHeader({
        method,
        url,
        data,
        headers: authHeader,
        httpsAgent: this.getHttpsAgent(baseUrl),
      })
    );
  }

  getRequestData({ monitors, output, isEdit, license }: ServiceData) {
    // don't need to pass locations to heartbeat
    const monitorsStreams = monitors.map(({ locations, ...rest }) =>
      convertToDataStreamFormat(rest)
    );

    return {
      monitors: monitorsStreams,
      output,
      stack_version: this.stackVersion,
      is_edit: isEdit,
      license_level: license.type,
      license_issued_to: license.issued_to,
      deployment_id: this.server.cloud?.deploymentId,
      cloud_id: this.server.cloud?.cloudId,
    };
  }

  isLoggable(result: unknown): result is { status?: any; request?: any } {
    const objCast = result as object;
    return Object.keys(objCast).some((k) => k === 'status' || k === 'request');
  }

  logSuccessMessage(
    url: string,
    method: string,
    numMonitors: number,
    result: AxiosResponse<unknown> | ServicePayload
  ) {
    if (this.isLoggable(result)) {
      if (result.data) {
        this.logger.debug(result.data as any);
      }
      this.logger.debug(
        `Successfully called service location ${url}${result.request?.path} with method ${method} with ${numMonitors} monitors`
      );
    }
  }

  logServiceError(
    err: AxiosError<{ reason: string; status: number }>,
    url: string,
    method: string,
    numMonitors: number
  ) {
    const reason = err.response?.data?.reason ?? '';

    err.message = `Failed to call service location ${url}${err.request?.path} with method ${method} with ${numMonitors} monitors:  ${err.message}, ${reason}`;
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
  }
}
