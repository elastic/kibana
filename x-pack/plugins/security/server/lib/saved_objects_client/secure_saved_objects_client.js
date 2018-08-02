/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      callWithRequestRepository,
      errors,
      internalRepository,
      request,
      securityContextService,
    } = options;

    this.errors = errors;
    this._callWithRequestRepository = callWithRequestRepository;
    this._internalRepository = internalRepository;
    this._request = request;
    this._securityContextService = securityContextService;
  }

  async create(type, attributes = {}, options = {}) {
    return await this._execute(
      repository => repository.create(type, attributes, options),
    );
  }

  async bulkCreate(objects, options = {}) {
    return await this._execute(
      repository => repository.bulkCreate(objects, options),
    );
  }

  async delete(type, id) {
    return await this._execute(
      repository => repository.delete(type, id),
    );
  }

  async find(options = {}) {
    return await this._execute(
      repository => repository.find(options)
    );
  }

  async bulkGet(objects = [], options = {}) {
    return await this._execute(
      repository => repository.bulkGet(objects, options)
    );
  }

  async get(type, id, options = {}) {
    return await this._execute(
      repository => repository.get(type, id, options)
    );
  }

  async update(type, id, attributes, options = {}) {
    return await this._execute(
      repository => repository.update(type, id, attributes, options)
    );
  }

  async _execute(fn) {
    const securityContext = this._securityContextService.get(this._request);
    if (securityContext.rbac) {
      return await fn(this._internalRepository);
    }

    if (securityContext.legacy) {
      return await fn(this._callWithRequestRepository);
    }

    throw new Error('Unable to determine which repository to use from context', securityContext);
  }
}
