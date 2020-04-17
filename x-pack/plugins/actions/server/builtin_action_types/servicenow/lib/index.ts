/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance, Method, AxiosResponse } from 'axios';

import { INCIDENT_URL, USER_URL, COMMENT_URL, VIEW_INCIDENT_URL } from './constants';
import { Instance, Incident, IncidentResponse, UpdateIncident, CommentResponse } from './types';
import { Comment } from '../types';

const validStatusCodes = [200, 201];

class ServiceNow {
  private readonly incidentUrl: string;
  private readonly commentUrl: string;
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
    this.commentUrl = `${this.instance.url}/${COMMENT_URL}`;
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

  private _addTimeZoneToDate(date: string, timezone = 'GMT'): string {
    return `${date} GMT`;
  }

  private _getErrorMessage(msg: string) {
    return `[Action][ServiceNow]: ${msg}`;
  }

  private _getIncidentViewURL(id: string) {
    return `${this.instance.url}/${VIEW_INCIDENT_URL}${id}`;
  }

  async getUserID(): Promise<string> {
    try {
      const res = await this._request({ url: `${this.userUrl}${this.instance.username}` });
      return res.data.result[0].sys_id;
    } catch (error) {
      throw new Error(this._getErrorMessage(`Unable to get user id. Error: ${error.message}`));
    }
  }

  async getIncident(incidentId: string) {
    try {
      const res = await this._request({
        url: `${this.incidentUrl}/${incidentId}`,
      });

      return { ...res.data.result };
    } catch (error) {
      throw new Error(
        this._getErrorMessage(
          `Unable to get incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  }

  async createIncident(incident: Incident): Promise<IncidentResponse> {
    try {
      const res = await this._request({
        url: `${this.incidentUrl}`,
        method: 'post',
        data: { ...incident },
      });

      return {
        number: res.data.result.number,
        incidentId: res.data.result.sys_id,
        pushedDate: new Date(this._addTimeZoneToDate(res.data.result.sys_created_on)).toISOString(),
        url: this._getIncidentViewURL(res.data.result.sys_id),
      };
    } catch (error) {
      throw new Error(this._getErrorMessage(`Unable to create incident. Error: ${error.message}`));
    }
  }

  async updateIncident(incidentId: string, incident: UpdateIncident): Promise<IncidentResponse> {
    try {
      const res = await this._patch({
        url: `${this.incidentUrl}/${incidentId}`,
        data: { ...incident },
      });

      return {
        number: res.data.result.number,
        incidentId: res.data.result.sys_id,
        pushedDate: new Date(this._addTimeZoneToDate(res.data.result.sys_updated_on)).toISOString(),
        url: this._getIncidentViewURL(res.data.result.sys_id),
      };
    } catch (error) {
      throw new Error(
        this._getErrorMessage(
          `Unable to update incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  }

  async batchCreateComments(
    incidentId: string,
    comments: Comment[],
    field: string
  ): Promise<CommentResponse[]> {
    // Create comments sequentially.
    const promises = comments.reduce(async (prevPromise, currentComment) => {
      const totalComments = await prevPromise;
      const res = await this.createComment(incidentId, currentComment, field);
      return [...totalComments, res];
    }, Promise.resolve([] as CommentResponse[]));

    const res = await promises;
    return res;
  }

  async createComment(
    incidentId: string,
    comment: Comment,
    field: string
  ): Promise<CommentResponse> {
    try {
      const res = await this._patch({
        url: `${this.commentUrl}/${incidentId}`,
        data: { [field]: comment.comment },
      });

      return {
        commentId: comment.commentId,
        pushedDate: new Date(this._addTimeZoneToDate(res.data.result.sys_updated_on)).toISOString(),
      };
    } catch (error) {
      throw new Error(
        this._getErrorMessage(
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  }
}

export { ServiceNow };
