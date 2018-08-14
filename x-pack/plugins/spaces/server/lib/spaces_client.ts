/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { omit } from 'lodash';
import { isReservedSpace } from '../../common/is_reserved_space';
import { actions } from './actions';

export class SpacesClient {
  private readonly authorization: any;
  private readonly callWithRequestSavedObjectRepository: any;
  private readonly internalSavedObjectRepository: any;
  private readonly request: any;

  constructor(
    authorization: any,
    callWithRequestSavedObjectRepository: any,
    internalSavedObjectRepository: any,
    request: any
  ) {
    this.authorization = authorization;
    this.callWithRequestSavedObjectRepository = callWithRequestSavedObjectRepository;
    this.internalSavedObjectRepository = internalSavedObjectRepository;
    this.request = request;
  }

  public async getAll() {
    if (this.useRbac()) {
      const { saved_objects } = await this.internalSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: 1000,
      });

      const spaces = saved_objects.map(this.transformSavedObjectToSpace);

      const spaceIds = spaces.map((space: any) => space.id);
      const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
      const { response } = await checkPrivileges(spaceIds, [this.authorization.actions.login]);

      const authorized = Object.keys(response).filter(space => {
        return response[space][this.authorization.actions.login];
      });

      if (authorized.length === 0) {
        return Boom.forbidden();
      }

      return spaces.filter((space: any) => authorized.includes(space.id));
    } else {
      const { saved_objects } = await this.callWithRequestSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: 1000,
      });

      return saved_objects.map(this.transformSavedObjectToSpace);
    }
  }

  public async get(id: string) {
    if (this.useRbac()) {
      await this.ensureAuthorized(
        id,
        this.authorization.actions.login,
        `Unauthorized to get ${id} space`
      );
    }
    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const savedObject = await repository.get('space', id);
    return this.transformSavedObjectToSpace(savedObject);
  }

  public async create(space: any) {
    if (this.useRbac()) {
      await this.ensureAuthorized(
        this.authorization.RESOURCES.ALL,
        actions.manage,
        'Unauthorized to create spaces'
      );
    }
    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const attributes = omit(space, ['id', '_reserved']);
    const id = space.id;
    const createdSavedObject = await repository.create('space', attributes, { id });
    return this.transformSavedObjectToSpace(createdSavedObject);
  }

  public async update(id: string, space: any) {
    if (this.useRbac()) {
      await this.ensureAuthorized(
        this.authorization.RESOURCES.ALL,
        actions.manage,
        'Unauthorized to update spaces'
      );
    }
    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const attributes = omit(space, 'id', '_reserved');
    const updatedSavedObject = await repository.update('space', id, attributes);
    return this.transformSavedObjectToSpace(updatedSavedObject);
  }

  public async delete(id: string) {
    if (this.useRbac()) {
      await this.ensureAuthorized(
        this.authorization.RESOURCES.ALL,
        actions.manage,
        'Unauthorized to delete spaces'
      );
    }

    const existingSpace = await this.get(id);
    if (isReservedSpace(existingSpace)) {
      throw Boom.badRequest('This Space cannot be deleted because it is reserved.');
    }

    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;
    await repository.delete('space', id);
  }

  private useRbac(): boolean {
    return this.authorization && this.authorization.mode.useRbacForRequest(this.request);
  }

  private async ensureAuthorized(resource: string, action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { result } = await checkPrivileges([resource], [action]);

    switch (result) {
      case this.authorization.CHECK_PRIVILEGES_RESULT.AUTHORIZED: {
        return;
      }
      case this.authorization.CHECK_PRIVILEGES_RESULT.LEGACY:
      case this.authorization.CHECK_PRIVILEGES_RESULT.UNAUTHORIZED: {
        throw Boom.forbidden(forbiddenMessage);
      }
      default: {
        throw new Error('Unexpected result from checkPrivileges');
      }
    }
  }

  private transformSavedObjectToSpace(savedObject: any) {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  }
}
