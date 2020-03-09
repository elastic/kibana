/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosInstance, Method, AxiosResponse } from 'axios';

import { INCIDENT_URL, USER_URL, COMMENT_URL } from './constants';
import { Instance, Incident, IncidentResponse, UpdateIncident, CommentResponse } from './types';
import { CommentType } from '../types';

const validStatusCodes = [200, 201];

const commentTemplate = {
  name: 'incident',
  element: 'comments',
};

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

    return { number: res.data.result.number, incidentId: res.data.result.sys_id };
  }

  async updateIncident(incidentId: string, incident: UpdateIncident): Promise<IncidentResponse> {
    const res = await this._patch({
      url: `${this.incidentUrl}/${incidentId}`,
      data: { ...incident },
    });

    return { number: res.data.result.number, incidentId: res.data.result.sys_id };
  }

  async batchCreateComments(
    incidentId: string,
    comments: CommentType[],
    field: string
  ): Promise<CommentResponse[]> {
    const res = await Promise.all(comments.map(c => this.createComment(incidentId, c, field)));
    return res;
  }

  async batchUpdateComments(comments: CommentType[]): Promise<CommentResponse[]> {
    const res = await Promise.all(comments.map(c => this.updateComment(c)));
    return res;
  }

  async createComment(
    incidentId: string,
    comment: CommentType,
    field: string
  ): Promise<CommentResponse> {
    const res = await this._request({
      url: this.commentUrl,
      method: 'post',
      data: { ...commentTemplate, element_id: incidentId, value: comment.comment, element: field },
    });

    return { commentId: res.data.result.sys_id };
  }

  async updateComment(comment: CommentType): Promise<CommentResponse> {
    const res = await this._patch({
      url: `${this.commentUrl}/${comment.incidentCommentId}`,
      data: { value: comment.comment },
    });

    return { commentId: res.data.result.sys_id };
  }
}

export { ServiceNow };
