/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from 'src/core/server';

import type {
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  ISpacesClient,
  Space,
} from '../../../spaces/server';
import type { AuditLogger } from '../audit';
import { SpaceAuditAction, spaceAuditEvent } from '../audit';
import type { AuthorizationServiceSetup } from '../authorization';
import type { SecurityPluginSetup } from '../plugin';
import type { LegacySpacesAuditLogger } from './legacy_audit_logger';

const PURPOSE_PRIVILEGE_MAP: Record<
  GetAllSpacesPurpose,
  (authorization: SecurityPluginSetup['authz']) => string[]
> = {
  any: (authorization) => [authorization.actions.login],
  copySavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'copyIntoSpace'),
  ],
  findSavedObjects: (authorization) => {
    return [authorization.actions.login, authorization.actions.savedObject.get('config', 'find')];
  },
  shareSavedObjectsIntoSpace: (authorization) => [
    authorization.actions.ui.get('savedObjectsManagement', 'shareIntoSpace'),
  ],
};

export class SecureSpacesClientWrapper implements ISpacesClient {
  private readonly useRbac = this.authorization.mode.useRbacForRequest(this.request);

  constructor(
    private readonly spacesClient: ISpacesClient,
    private readonly request: KibanaRequest,
    private readonly authorization: AuthorizationServiceSetup,
    private readonly auditLogger: AuditLogger,
    private readonly legacyAuditLogger: LegacySpacesAuditLogger
  ) {}

  public async getAll({
    purpose = 'any',
    includeAuthorizedPurposes,
  }: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const allSpaces = await this.spacesClient.getAll({ purpose, includeAuthorizedPurposes });

    if (!this.useRbac) {
      allSpaces.forEach(({ id }) =>
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.FIND,
            savedObject: { type: 'space', id },
          })
        )
      );

      return allSpaces;
    }

    const spaceIds = allSpaces.map((space: Space) => space.id);

    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);

    // Collect all privileges which need to be checked
    const allPrivileges = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
      (acc, [getSpacesPurpose, privilegeFactory]) =>
        !includeAuthorizedPurposes && getSpacesPurpose !== purpose
          ? acc
          : { ...acc, [getSpacesPurpose]: privilegeFactory(this.authorization) },
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
    const authorizedSpaces: GetSpaceResult[] = allSpaces
      .map((space: Space) => {
        if (!includeAuthorizedPurposes) {
          // Check if the user is authorized for a single purpose
          const requiredActions = PURPOSE_PRIVILEGE_MAP[purpose](this.authorization);
          return checkHasAllRequired(space, requiredActions) ? space : null;
        }

        // Check if the user is authorized for each purpose
        let hasAnyAuthorization = false;
        const authorizedPurposes = Object.entries(PURPOSE_PRIVILEGE_MAP).reduce(
          (acc, [purposeKey, privilegeFactory]) => {
            const requiredActions = privilegeFactory(this.authorization);
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
      .filter(this.filterUnauthorizedSpaceResults);

    if (authorizedSpaces.length === 0) {
      const error = Boom.forbidden();

      this.legacyAuditLogger.spacesAuthorizationFailure(username, 'getAll');
      this.auditLogger.log(
        spaceAuditEvent({
          action: SpaceAuditAction.FIND,
          error,
        })
      );

      throw error; // Note: there is a catch for this in `SpacesSavedObjectsClient.find`; if we get rid of this error, remove that too
    }

    const authorizedSpaceIds = authorizedSpaces.map((space) => space.id);

    this.legacyAuditLogger.spacesAuthorizationSuccess(username, 'getAll', authorizedSpaceIds);
    authorizedSpaces.forEach(({ id }) =>
      this.auditLogger.log(
        spaceAuditEvent({
          action: SpaceAuditAction.FIND,
          savedObject: { type: 'space', id },
        })
      )
    );

    return authorizedSpaces;
  }

  public async get(id: string) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedAtSpace(
          id,
          this.authorization.actions.login,
          'get',
          `Unauthorized to get ${id} space`
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.GET,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    const space = this.spacesClient.get(id);

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.GET,
        savedObject: { type: 'space', id },
      })
    );

    return space;
  }

  public async create(space: Space) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'create',
          'Unauthorized to create spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.CREATE,
            savedObject: { type: 'space', id: space.id },
            error,
          })
        );
        throw error;
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id: space.id },
      })
    );

    return this.spacesClient.create(space);
  }

  public async update(id: string, space: Space) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'update',
          'Unauthorized to update spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.UPDATE,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.UPDATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id },
      })
    );

    return this.spacesClient.update(id, space);
  }

  public async delete(id: string) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
          'delete',
          'Unauthorized to delete spaces'
        );
      } catch (error) {
        this.auditLogger.log(
          spaceAuditEvent({
            action: SpaceAuditAction.DELETE,
            savedObject: { type: 'space', id },
            error,
          })
        );
        throw error;
      }
    }

    this.auditLogger.log(
      spaceAuditEvent({
        action: SpaceAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'space', id },
      })
    );

    return this.spacesClient.delete(id);
  }

  private async ensureAuthorizedGlobally(action: string, method: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.globally({ kibana: action });

    if (hasAllRequested) {
      this.legacyAuditLogger.spacesAuthorizationSuccess(username, method);
    } else {
      this.legacyAuditLogger.spacesAuthorizationFailure(username, method);
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private async ensureAuthorizedAtSpace(
    spaceId: string,
    action: string,
    method: string,
    forbiddenMessage: string
  ) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { username, hasAllRequested } = await checkPrivileges.atSpace(spaceId, {
      kibana: action,
    });

    if (hasAllRequested) {
      this.legacyAuditLogger.spacesAuthorizationSuccess(username, method, [spaceId]);
    } else {
      this.legacyAuditLogger.spacesAuthorizationFailure(username, method, [spaceId]);
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private filterUnauthorizedSpaceResults(value: GetSpaceResult | null): value is GetSpaceResult {
    return value !== null;
  }
}
