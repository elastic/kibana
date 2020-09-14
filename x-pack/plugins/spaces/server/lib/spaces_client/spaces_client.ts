/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { omit } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../security/server';
import { isReservedSpace } from '../../../common/is_reserved_space';
import { Space } from '../../../common/model/space';
import { SpacesAuditLogger } from '../audit_logger';
import { ConfigType } from '../../config';
import { GetSpacePurpose } from '../../../common/model/types';

const SUPPORTED_GET_SPACE_PURPOSES: GetSpacePurpose[] = [
  'any',
  'copySavedObjectsIntoSpace',
  'findSavedObjects',
  'shareSavedObjectsIntoSpace',
];

const PURPOSE_PRIVILEGE_MAP: Record<
  GetSpacePurpose,
  (authorization: SecurityPluginSetup['authz']) => string[]
> = {
  any: (authorization) => [authorization.actions.login],
  copySavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'copyIntoSpace'),
  ],
  findSavedObjects: (authorization) => {
    return [authorization.actions.savedObject.get('config', 'find')];
  },
  shareSavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'shareIntoSpace'),
  ],
};

export class SpacesClient {
  constructor(
    private readonly auditLogger: SpacesAuditLogger,
    private readonly debugLogger: (message: string) => void,
    private readonly authorization: SecurityPluginSetup['authz'] | null,
    private readonly callWithRequestSavedObjectRepository: any,
    private readonly config: ConfigType,
    private readonly internalSavedObjectRepository: any,
    private readonly request: KibanaRequest
  ) {}

  public async canEnumerateSpaces(): Promise<boolean> {
    if (this.useRbac()) {
      const checkPrivileges = this.authorization!.checkPrivilegesWithRequest(this.request);
      const { hasAllRequested } = await checkPrivileges.globally(
        this.authorization!.actions.space.manage
      );
      this.debugLogger(`SpacesClient.canEnumerateSpaces, using RBAC. Result: ${hasAllRequested}`);
      return hasAllRequested;
    }

    // If not RBAC, then security isn't enabled and we can enumerate all spaces
    this.debugLogger(`SpacesClient.canEnumerateSpaces, NOT USING RBAC. Result: true`);
    return true;
  }

  public async getAll(purpose: GetSpacePurpose = 'any'): Promise<Space[]> {
    if (!SUPPORTED_GET_SPACE_PURPOSES.includes(purpose)) {
      throw Boom.badRequest(`unsupported space purpose: ${purpose}`);
    }

    if (this.useRbac()) {
      const privilegeFactory = PURPOSE_PRIVILEGE_MAP[purpose];

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { saved_objects } = await this.internalSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: this.config.maxSpaces,
        sortField: 'name.keyword',
      });

      this.debugLogger(`SpacesClient.getAll(), using RBAC. Found ${saved_objects.length} spaces`);

      const spaces = saved_objects.map(this.transformSavedObjectToSpace);

      const spaceIds = spaces.map((space: Space) => space.id);
      const checkPrivileges = this.authorization!.checkPrivilegesWithRequest(this.request);

      const privilege = privilegeFactory(this.authorization!);

      const { username, privileges } = await checkPrivileges.atSpaces(spaceIds, privilege);

      const authorized = privileges.filter((x) => x.authorized).map((x) => x.resource);

      this.debugLogger(
        `SpacesClient.getAll(), authorized for ${
          authorized.length
        } spaces, derived from ES privilege check: ${JSON.stringify(privileges)}`
      );

      if (authorized.length === 0) {
        this.debugLogger(
          `SpacesClient.getAll(), using RBAC. returning 403/Forbidden. Not authorized for any spaces for ${purpose} purpose.`
        );
        this.auditLogger.spacesAuthorizationFailure(username, 'getAll');
        throw Boom.forbidden();
      }

      this.auditLogger.spacesAuthorizationSuccess(username, 'getAll', authorized as string[]);
      const filteredSpaces: Space[] = spaces.filter((space: any) => authorized.includes(space.id));
      this.debugLogger(
        `SpacesClient.getAll(), using RBAC. returning spaces: ${filteredSpaces
          .map((s) => s.id)
          .join(',')}`
      );
      return filteredSpaces;
    } else {
      this.debugLogger(`SpacesClient.getAll(), NOT USING RBAC. querying all spaces`);

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { saved_objects } = await this.callWithRequestSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: this.config.maxSpaces,
        sortField: 'name.keyword',
      });

      this.debugLogger(
        `SpacesClient.getAll(), NOT USING RBAC. Found ${saved_objects.length} spaces.`
      );

      return saved_objects.map(this.transformSavedObjectToSpace);
    }
  }

  public async get(id: string): Promise<Space> {
    if (this.useRbac()) {
      await this.ensureAuthorizedAtSpace(
        id,
        this.authorization!.actions.login,
        'get',
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
      this.debugLogger(`SpacesClient.create(), using RBAC. Checking if authorized globally`);

      await this.ensureAuthorizedGlobally(
        this.authorization!.actions.space.manage,
        'create',
        'Unauthorized to create spaces'
      );

      this.debugLogger(`SpacesClient.create(), using RBAC. Global authorization check succeeded`);
    }
    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const { total } = await repository.find({
      type: 'space',
      page: 1,
      perPage: 0,
    });
    if (total >= this.config.maxSpaces) {
      throw Boom.badRequest(
        'Unable to create Space, this exceeds the maximum number of spaces set by the xpack.spaces.maxSpaces setting'
      );
    }

    this.debugLogger(`SpacesClient.create(), using RBAC. Attempting to create space`);

    const attributes = omit(space, ['id', '_reserved']);
    const id = space.id;
    const createdSavedObject = await repository.create('space', attributes, { id });

    this.debugLogger(`SpacesClient.create(), created space object`);

    return this.transformSavedObjectToSpace(createdSavedObject);
  }

  public async update(id: string, space: Space) {
    if (this.useRbac()) {
      await this.ensureAuthorizedGlobally(
        this.authorization!.actions.space.manage,
        'update',
        'Unauthorized to update spaces'
      );
    }
    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const attributes = omit(space, 'id', '_reserved');
    await repository.update('space', id, attributes);
    const updatedSavedObject = await repository.get('space', id);
    return this.transformSavedObjectToSpace(updatedSavedObject);
  }

  public async delete(id: string) {
    if (this.useRbac()) {
      await this.ensureAuthorizedGlobally(
        this.authorization!.actions.space.manage,
        'delete',
        'Unauthorized to delete spaces'
      );
    }

    const repository = this.useRbac()
      ? this.internalSavedObjectRepository
      : this.callWithRequestSavedObjectRepository;

    const existingSavedObject = await repository.get('space', id);
    if (isReservedSpace(this.transformSavedObjectToSpace(existingSavedObject))) {
      throw Boom.badRequest('This Space cannot be deleted because it is reserved.');
    }

    await repository.deleteByNamespace(id);

    await repository.delete('space', id);
  }

  private useRbac(): boolean {
    return this.authorization != null && this.authorization.mode.useRbacForRequest(this.request);
  }

  private async ensureAuthorizedGlobally(action: string, method: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization!.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.globally(action);

    if (hasAllRequested) {
      this.auditLogger.spacesAuthorizationSuccess(username, method);
      return;
    } else {
      this.auditLogger.spacesAuthorizationFailure(username, method);
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private async ensureAuthorizedAtSpace(
    spaceId: string,
    action: string,
    method: string,
    forbiddenMessage: string
  ) {
    const checkPrivileges = this.authorization!.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.atSpace(spaceId, action);

    if (hasAllRequested) {
      this.auditLogger.spacesAuthorizationSuccess(username, method, [spaceId]);
      return;
    } else {
      this.auditLogger.spacesAuthorizationFailure(username, method, [spaceId]);
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
