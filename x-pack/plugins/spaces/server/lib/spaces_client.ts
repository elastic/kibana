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

  private async getAllWithRepository(repository: any) {
    const { saved_objects } = await repository.find({
      type: 'space',
      page: 1,
      perPage: 1000,
    });

    return saved_objects.map((savedObject: any) => ({
      id: savedObject.id,
      ...savedObject.attributes,
    }));
  }
}
