/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { omit } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../security/server';
import { isReservedSpace } from '../../../common/is_reserved_space';
import { Space } from '../../../common/model/space';
import { SpacesAuditLogger } from '../audit_logger';
import { ConfigType } from '../../config';
import { GetAllSpacesPurpose, GetSpaceResult } from '../../../common/model/types';

interface GetAllSpacesOptions {
  purpose?: GetAllSpacesPurpose;
  includeAuthorizedPurposes?: boolean;
}

const SUPPORTED_GET_SPACE_PURPOSES: GetAllSpacesPurpose[] = [
  'any',
  'copySavedObjectsIntoSpace',
  'findSavedObjects',
  'shareSavedObjectsIntoSpace',
];
const DEFAULT_PURPOSE = 'any';

const PURPOSE_PRIVILEGE_MAP: Record<
  GetAllSpacesPurpose,
  (authorization: SecurityPluginSetup['authz']) => string[]
> = {
  any: (authorization) => [authorization.actions.login],
  copySavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'copyIntoSpace'),
  ],
  findSavedObjects: (authorization) => [
    authorization.actions.login,
    authorization.actions.savedObject.get('config', 'find'),
  ],
  shareSavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'shareIntoSpace'),
  ],
};

function filterUnauthorizedSpaceResults(value: GetSpaceResult | null): value is GetSpaceResult {
  return value !== null;
}

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

  public async getAll(options: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const { purpose = DEFAULT_PURPOSE, includeAuthorizedPurposes = false } = options;
    if (!SUPPORTED_GET_SPACE_PURPOSES.includes(purpose)) {
      throw Boom.badRequest(`unsupported space purpose: ${purpose}`);
    }

    if (options.purpose && includeAuthorizedPurposes) {
      throw Boom.badRequest(`'purpose' cannot be supplied with 'includeAuthorizedPurposes'`);
    }

    if (this.useRbac()) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { saved_objects } = await this.internalSavedObjectRepository.find({
        type: 'space',
        page: 1,
        perPage: this.config.maxSpaces,
        sortField: 'name.keyword',
      });

      this.debugLogger(`SpacesClient.getAll(), using RBAC. Found ${saved_objects.length} spaces`);

      const spaces: GetSpaceResult[] = saved_objects.map(this.transformSavedObjectToSpace);
      const spaceIds = spaces.map((space: Space) => space.id);

      const checkPrivileges = this.authorization!.checkPrivilegesWithRequest(this.request);

      // Collect all privileges which need to be checked
      const allPrivileges = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
        (acc, [getSpacesPurpose, privilegeFactory]) =>
          !includeAuthorizedPurposes && getSpacesPurpose !== purpose
            ? acc
            : { ...acc, [getSpacesPurpose]: privilegeFactory(this.authorization!) },
        {} as Record<GetAllSpacesPurpose, string[]>
      );

      // Check all privileges against all spaces
      const { username, privileges } = await checkPrivileges.atSpaces(spaceIds, {
        kibana: Object.values(allPrivileges).flat(),
      });

      // Determine which purposes the user is authorized for within each space.
      // Remove any spaces for which user is fully unauthorized.
      const checkHasAllRequired = (space: Space, actions: string[]) =>
        actions.every((action) =>
          privileges.kibana.some(
            ({ resource, privilege, authorized }) =>
              resource === space.id && privilege === action && authorized
          )
        );
      const authorizedSpaces = spaces
        .map((space: Space) => {
          if (!includeAuthorizedPurposes) {
            // Check if the user is authorized for a single purpose
            const requiredActions = PURPOSE_PRIVILEGE_MAP[purpose](this.authorization!);
            return checkHasAllRequired(space, requiredActions) ? space : null;
          }

          // Check if the user is authorized for each purpose
          let hasAnyAuthorization = false;
          const authorizedPurposes = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
            (acc, [purposeKey, privilegeFactory]) => {
              const requiredActions = privilegeFactory(this.authorization!);
              const hasAllRequired = checkHasAllRequired(space, requiredActions);
              hasAnyAuthorization = hasAnyAuthorization || hasAllRequired;
              return { ...acc, [purposeKey]: hasAllRequired };
            },
            {} as Record<GetAllSpacesPurpose, boolean>
          );

          if (!hasAnyAuthorization) {
            return null;
          }
          return { ...space, authorizedPurposes };
        })
        .filter(filterUnauthorizedSpaceResults);

      if (authorizedSpaces.length === 0) {
        this.debugLogger(
          `SpacesClient.getAll(), using RBAC. returning 403/Forbidden. Not authorized for any spaces for ${purpose} purpose.`
        );
        this.auditLogger.spacesAuthorizationFailure(username, 'getAll');
        throw Boom.forbidden(); // Note: there is a catch for this in `SpacesSavedObjectsClient.find`; if we get rid of this error, remove that too
      }

      const authorizedSpaceIds = authorizedSpaces.map((s) => s.id);
      this.auditLogger.spacesAuthorizationSuccess(username, 'getAll', authorizedSpaceIds);
      this.debugLogger(
        `SpacesClient.getAll(), using RBAC. returning spaces: ${authorizedSpaceIds.join(',')}`
      );
      return authorizedSpaces;
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
    const { username, hasAllRequested } = await checkPrivileges.globally({ kibana: action });

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
    const { username, hasAllRequested } = await checkPrivileges.atSpace(spaceId, {
      kibana: action,
    });

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
