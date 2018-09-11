/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { omit } from 'lodash';
import { isReservedSpace } from '../../common/is_reserved_space';
import { Space } from '../../common/model/space';
import { SpacesAuditLogger } from './audit_logger';

export class SpacesClient {
  private readonly auditLogger: SpacesAuditLogger;
  private readonly authorization: any;
  private readonly callWithRequestSavedObjectRepository: any;
  private readonly internalSavedObjectRepository: any;
  private readonly request: any;

  constructor(
    auditLogger: SpacesAuditLogger,
    authorization: any,
    callWithRequestSavedObjectRepository: any,
    internalSavedObjectRepository: any,
    request: any
  ) {
    this.auditLogger = auditLogger;
    this.authorization = authorization;
    this.callWithRequestSavedObjectRepository = callWithRequestSavedObjectRepository;
    this.internalSavedObjectRepository = internalSavedObjectRepository;
    this.request = request;
  }

  public async getAll(): Promise<[Space]> {
    if (this.useRbac()) {
      const { saved_objects } = await this.internalSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: 1000,
      });

      const spaces = saved_objects.map(this.transformSavedObjectToSpace);

      const spaceIds = spaces.map((space: Space) => space.id);
      const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
      const { username, spacePrivileges } = await checkPrivileges.atSpaces(
        spaceIds,
        this.authorization.actions.login
      );

      const authorized = Object.keys(spacePrivileges).filter(spaceId => {
        return spacePrivileges[spaceId][this.authorization.actions.login];
      });

      if (authorized.length === 0) {
        this.auditLogger.spacesAuthorizationFailure(username, 'getAll');
        throw Boom.forbidden();
      }

      this.auditLogger.spacesAuthorizationSuccess(username, 'getAll', authorized);
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

  public async get(id: string): Promise<Space> {
    if (this.useRbac()) {
      await this.ensureAuthorizedAtSpace(
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

  public async create(space: Space) {
    if (this.useRbac()) {
      await this.ensureAuthorizedGlobally(
        this.authorization.actions.manageSpaces,
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

  public async update(id: string, space: Space) {
    if (this.useRbac()) {
      await this.ensureAuthorizedGlobally(
        this.authorization.actions.manageSpaces,
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
      await this.ensureAuthorizedGlobally(
        this.authorization.actions.manageSpaces,
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

  private async ensureAuthorizedGlobally(action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.globally(action);

    if (hasAllRequested) {
      this.auditLogger.spacesAuthorizationSuccess(username, action);
      return;
    } else {
      this.auditLogger.spacesAuthorizationFailure(username, action);
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private async ensureAuthorizedAtSpace(spaceId: string, action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.atSpace(spaceId, action);

    if (hasAllRequested) {
      this.auditLogger.spacesAuthorizationSuccess(username, action, [spaceId]);
      return;
    } else {
      this.auditLogger.spacesAuthorizationFailure(username, action, [spaceId]);
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private transformSavedObjectToSpace(savedObject: any): Space {
    return {
      id: savedObject.id,
      ...savedObject.attributes,
    } as Space;
  }
}
