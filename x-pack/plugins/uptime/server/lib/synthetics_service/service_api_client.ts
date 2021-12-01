/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosPromise } from 'axios';
import { ServiceLocations, SyntheticsMonitorSavedObject } from '../../../common/types';
import { getServiceLocations } from './get_service_locations';

const TEST_SERVICE_USERNAME = 'localKibanaIntegrationTestsUser';

export type MonitorConfigs = Array<SyntheticsMonitorSavedObject['attributes'] & { id: string }>;

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

  constructor(manifestUrl: string, username: string, password: string) {
    this.username = username;
    this.authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

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
      return true;
    }

    const callServiceEndpoint = (monitors: ServiceData['monitors'], url: string) => {
      return axios({
        // service uses the same method for PUT
        method,
        url: url + '/monitors',
        data: { monitors, output },
        headers: {
          Authorization: this.authorization,
        },
      });
    };

    // TODO: Use rxjs to better handle promises
    const promises: AxiosPromise[] = [];

    this.locations.forEach(({ id, url }) => {
      const locMonitors = allMonitors.filter(
        ({ locations }) => !locations || locations?.includes(id)
      );
      if (locMonitors.length > 0) {
        promises.push(callServiceEndpoint(locMonitors, url));
      }
    });

    try {
      return await Promise.all(promises);
    } catch (err) {
      throw err;
    }
  }
}
