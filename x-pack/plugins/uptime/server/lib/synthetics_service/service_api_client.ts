/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { forkJoin, from as rxjsFrom, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ServiceLocations, SyntheticsMonitorSavedObject } from '../../../common/types';
import { getServiceLocations } from './get_service_locations';
import { Logger } from '../../../../../../src/core/server';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export type MonitorConfigs = Array<
  SyntheticsMonitorSavedObject['attributes'] & {
    id: string;
    source?: {
      inline: {
        script: string;
      };
    };
  }
>;

export interface ServiceData {
  monitors: MonitorConfigs;
  output: {
    hosts: string[];
    api_key: string;
  };
}

export class ServiceAPIClient {
  private readonly username: string;
  private readonly authorization: string;
  private locations: ServiceLocations;
  private logger: Logger;

  constructor(manifestUrl: string, username: string, password: string, logger: Logger) {
    this.username = username;
    this.authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    this.logger = logger;
    this.locations = [];

    getServiceLocations({ manifestUrl }).then((result) => {
      this.locations = result;
    });
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
      return axios({
        method,
        url: url + '/monitors',
        data: { monitors, output },
        headers: {
          Authorization: this.authorization,
        },
      });
    };

    const pushErrors: Array<{ locationId: string; error: Error }> = [];

    const promises: Array<Observable<unknown>> = [];

    this.locations.forEach(({ id, url }) => {
      const locMonitors = allMonitors.filter(
        ({ locations }) => !locations || locations?.includes(id)
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
