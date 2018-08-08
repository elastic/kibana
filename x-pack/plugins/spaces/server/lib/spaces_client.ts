/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

export class SpacesClient {
  private readonly authorization: any;
  private readonly callWithRequestRepository: any;
  private readonly internalSavedObjectRepository: any;
  private readonly request: any;

  constructor(
    authorization: any,
    callWithRequestRepository: any,
    internalSavedObjectRepository: any,
    request: any
  ) {
    this.authorization = authorization;
    this.callWithRequestRepository = callWithRequestRepository;
    this.internalSavedObjectRepository = internalSavedObjectRepository;
    this.request = request;
  }

  public async getAll() {
    if (!this.authorization || !this.authorization.isRbacEnabled()) {
      return await this.getAllWithRepository(this.callWithRequestRepository);
    }

    const spaces = await this.getAllWithRepository(this.internalSavedObjectRepository);

    const spaceIds = spaces.map((space: any) => space.id);
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { result, response } = await checkPrivileges(spaceIds, [
      this.authorization.actions.login,
    ]);
    switch (result) {
      case this.authorization.CHECK_PRIVILEGES_RESULT.LEGACY: {
        return await this.getAllWithRepository(this.callWithRequestRepository);
      }
      default: {
        const authorized = Object.keys(response).filter(space => {
          return response[space][this.authorization.actions.login];
        });

        if (authorized.length === 0) {
          return Boom.forbidden();
        }

        return spaces.filter((space: any) => authorized.includes(space.id));
      }
    }
  }

  public async get(spaceId: number) {
    if (!this.authorization || !this.authorization.isRbacEnabled()) {
      return await this.getWithRepository(this.callWithRequestRepository, spaceId);
    }

    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { result } = await checkPrivileges([spaceId], [this.authorization.actions.login]);

    switch (result) {
      case this.authorization.CHECK_PRIVILEGES_RESULT.LEGACY: {
        return await this.getWithRepository(this.callWithRequestRepository, spaceId);
      }
      case this.authorization.CHECK_PRIVILEGES_RESULT.AUTHORIZED: {
        return await this.getWithRepository(this.internalSavedObjectRepository, spaceId);
      }
      case this.authorization.CHECK_PRIVILEGES_RESULT.UNAUTHORIZED: {
        return Boom.forbidden(`Unauthorized to get space ${spaceId}`);
      }
      default: {
        throw new Error('Unexpected result from checkPrivileges');
      }
    }
  }

  private async getWithRepository(repository: any, spaceId: number) {
    const savedObject = await repository.get('space', spaceId);

    return this.transformSavedObjectToSpace(savedObject);
  }

  private async getAllWithRepository(repository: any) {
    const { saved_objects } = await repository.find({
      type: 'space',
      page: 1,
      perPage: 1000,
    });

    return saved_objects.map(this.transformSavedObjectToSpace);
  }

  private transformSavedObjectToSpace(savedObject: any) {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    };
  }
}
