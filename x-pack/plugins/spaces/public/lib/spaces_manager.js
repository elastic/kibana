/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SpacesManager {
  constructor(httpAgent, chrome) {
    this._httpAgent = httpAgent;
    this._baseUrl = chrome.addBasePath(`/api/spaces/v1/spaces`);
  }

  async getSpaces() {
    return await this._httpAgent
      .get(this._baseUrl)
      .then(response => response.data);
  }

  async getSpace(id) {
    return await this._httpAgent
      .get(`${this._baseUrl}/${id}`)
      .then(response => response.data);
  }

  async createSpace(space) {
    return await this._httpAgent
      .post(`${this._baseUrl}/${space.id}`, space)
      .then(response => response.data);
  }

  async updateSpace(space) {
    return await this._httpAgent
      .post(`${this._baseUrl}/${space.id}?overwrite=true`, space)
      .then(response => response.data);
  }

  async deleteSpace(space) {
    return await this._httpAgent
      .delete(`${this._baseUrl}/${space.id}`)
      .then(response => response.data);
  }
}
