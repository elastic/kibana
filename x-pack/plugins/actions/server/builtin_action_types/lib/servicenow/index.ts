/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance, Method, AxiosResponse } from 'axios';

import { INCIDENT_URL, USER_URL } from './constants';
import { Instance, Incident, IncidentResponse, UpdateIncident } from './types';

const validStatusCodes = [200, 201];

class ServiceNow {
  private readonly incidentUrl: string;
  private readonly userUrl: string;
  private readonly axios: AxiosInstance;

  constructor(private readonly instance: Instance) {
    if (
      !this.instance ||
      !this.instance.url ||
      !this.instance.username ||
      !this.instance.password
    ) {
      throw Error('[Action][ServiceNow]: Wrong configuration.');
    }

    this.incidentUrl = `${this.instance.url}/${INCIDENT_URL}`;
    this.userUrl = `${this.instance.url}/${USER_URL}`;
    this.axios = axios.create({
      auth: { username: this.instance.username, password: this.instance.password },
    });
  }

  private _throwIfNotAlive(status: number, contentType: string) {
    if (!validStatusCodes.includes(status) || !contentType.includes('application/json')) {
      throw new Error('[ServiceNow]: Instance is not alive.');
    }
  }

  private async _request({
    url,
    method = 'get',
    data = {},
  }: {
    url: string;
    method?: Method;
    data?: any;
  }): Promise<AxiosResponse> {
    const res = await this.axios(url, { method, data });
    this._throwIfNotAlive(res.status, res.headers['content-type']);
    return res;
  }

  private _patch({ url, data }: { url: string; data: any }): Promise<AxiosResponse> {
    return this._request({
      url,
      method: 'patch',
      data,
    });
  }

  async getUserID(): Promise<string> {
    const res = await this._request({ url: `${this.userUrl}${this.instance.username}` });
    return res.data.result[0].sys_id;
  }

  async createIncident(incident: Incident): Promise<IncidentResponse> {
    const res = await this._request({
      url: `${this.incidentUrl}`,
      method: 'post',
      data: { ...incident },
    });

    return { number: res.data.result.number, id: res.data.result.sys_id };
  }

  async updateIncident(incidentId: string, incident: UpdateIncident): Promise<void> {
    await this._patch({
      url: `${this.incidentUrl}/${incidentId}`,
      data: { ...incident },
    });
  }

  async batchAddComments(incidentId: string, comments: string[], field: string): Promise<void> {
    for (const comment of comments) {
      await this.addComment(incidentId, comment, field);
    }
  }

  async addComment(incidentId: string, comment: string, field: string): Promise<void> {
    await this._patch({
      url: `${this.incidentUrl}/${incidentId}`,
      data: { [field]: comment },
    });
  }
}

export { ServiceNow };
