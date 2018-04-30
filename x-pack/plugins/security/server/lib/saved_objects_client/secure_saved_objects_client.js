/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import Boom from 'boom';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';

export class SecureSavedObjectsClient {
  constructor(options) {
    const {
      server,
      request,
      baseClient,
      application,
      kibanaVersion,
    } = options;

    this.errors = baseClient.errors;

    this._client = baseClient;
    this._application = application;
    this._kibanaVersion = kibanaVersion;
    this._callCluster = getClient(server).callWithRequest;
    this._request = request;
  }

  async create(type, attributes = {}, options = {}) {
    await this._performAuthorizationCheck(type, 'create');

    return await this._client.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    for (const object of objects) {
      await this._performAuthorizationCheck(object.type, 'create');
    }

    return await this._client.bulkCreate(objects, options);
  }

  async delete(type, id) {
    await this._performAuthorizationCheck(type, 'delete');

    return await this._client.delete(type, id);
  }

  async find(options = {}) {
    await this._performAuthorizationCheck(options.type, 'search');

    return await this._client.find(options);
  }

  async bulkGet(objects = []) {
    for (const object of objects) {
      await this._performAuthorizationCheck(object.type, 'mget');
    }

    return await this._client.bulkGet(objects);
  }

  async get(type, id) {
    await this._performAuthorizationCheck(type, 'get');

    return await this._client.get(type, id);
  }

  async update(type, id, attributes, options = {}) {
    await this._performAuthorizationCheck(type, 'update');

    return await this._client.update(type, id, attributes, options);
  }

  async _performAuthorizationCheck(type, action) {
    const version = `version:${this._kibanaVersion}`;
    const kibanaAction = `action:saved-objects/${type}/${action}`;

    const privilegeCheck = await this._callCluster(this._request, 'shield.hasPrivileges', {
      body: {
        applications: [{
          application: this._application,
          resources: [DEFAULT_RESOURCE],
          privileges: [version, kibanaAction]
        }]
      }
    });

    if (!privilegeCheck.has_all_requested) {
      throw Boom.forbidden(`User ${privilegeCheck.username} is not authorized to ${action} objects of type ${type}`);
    }
  }
}
