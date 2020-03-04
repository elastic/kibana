/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance, Method, AxiosResponse } from 'axios';

import { Instance, Incident, IncidentResponse } from './types';
import { CommentType } from '../../servicenow/types';

const API_VERSION = 'v1';
const INCIDENT_URL = `api/now/${API_VERSION}/table/incident`;
const USER_URL = `api/now/${API_VERSION}/table/sys_user?user_name=`;

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

  _throwIfNotAlive(status: number, contentType: string) {
    if (!validStatusCodes.includes(status) || !contentType.includes('application/json')) {
      throw new Error('[ServiceNow]: Instance is not alive.');
    }
  }

  async _request({
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

  async batchAddComments(incidentId: string, comments: string[], field: string): Promise<void> {
    for (const comment of comments) {
      await this.addComment(incidentId, comment, field);
    }
  }

  async addComment(incidentId: string, comment: string, field: string): Promise<void> {
    await this._request({
      url: `${this.incidentUrl}/${incidentId}`,
      method: 'patch',
      data: { [field]: comment },
    });
  }
}

export { ServiceNow };
