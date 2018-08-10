/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      errors,
      internalRepository,
      request,
      securityContextService,
    } = options;

    this.errors = errors;
    this._internalRepository = internalRepository;
    this._request = request;
    this._securityContextService = securityContextService;
  }

  async create(type, attributes = {}, options = {}) {
    return await this._internalRepository.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    return await this._internalRepository.bulkCreate(objects, options);
  }

  async delete(type, id) {
    return await this._internalRepository.delete(type, id);
  }

  async find(options = {}) {
    return await this._internalRepository.find(options);
  }

  async bulkGet(objects = [], options = {}) {
    return await this._internalRepository.bulkGet(objects, options);
  }

  async get(type, id, options = {}) {
    return await this._internalRepository.get(type, id, options);
  }

  async update(type, id, attributes, options = {}) {
    return await this._internalRepository.update(type, id, attributes, options);
  }
}
