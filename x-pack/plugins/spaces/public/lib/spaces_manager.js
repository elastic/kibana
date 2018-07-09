/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { toastNotifications } from 'ui/notify';

import { EventEmitter } from 'events';

export class SpacesManager extends EventEmitter {
  constructor(httpAgent, chrome) {
    super();
    this._httpAgent = httpAgent;
    this._baseUrl = chrome.addBasePath(`/api/spaces/v1`);
  }

  async getSpaces() {
    return await this._httpAgent
      .get(`${this._baseUrl}/spaces`)
      .then(response => response.data);
  }

  async getSpace(id) {
    return await this._httpAgent
      .get(`${this._baseUrl}/space/${id}`);
  }

  async createSpace(space) {
    return await this._httpAgent
      .post(`${this._baseUrl}/space`, space);
  }

  async updateSpace(space) {
    return await this._httpAgent
      .put(`${this._baseUrl}/space/${space.id}?overwrite=true`, space);
  }

  async deleteSpace(space) {
    return await this._httpAgent
      .delete(`${this._baseUrl}/space/${space.id}`);
  }

  async changeSelectedSpace(space) {
    return await this._httpAgent
      .post(`${this._baseUrl}/space/${space.id}/select`)
      .then(response => {
        if (response.data && response.data.location) {
          window.location = response.data.location;
        } else {
          this._displayError();
        }
      })
      .catch(() => this._displayError());
  }

  async requestRefresh() {
    this.emit('request_refresh');
  }

  _displayError() {
    toastNotifications.addDanger({
      title: 'Unable to change your Space',
      text: 'please try again later'
    });
  }
}
