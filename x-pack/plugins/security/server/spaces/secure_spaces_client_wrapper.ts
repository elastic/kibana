/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, SavedObjectsClientContract } from 'src/core/server';

import type {
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  ISpacesClient,
  LegacyUrlAliasTarget,
  Space,
} from '../../../spaces/server';
import { ALL_SPACES_ID } from '../../common/constants';
import type { AuditLogger } from '../audit';
import { SavedObjectAction, savedObjectEvent, SpaceAuditAction, spaceAuditEvent } from '../audit';
import type { AuthorizationServiceSetup } from '../authorization';
import type { SecurityPluginSetup } from '../plugin';
import type { EnsureAuthorizedDependencies, EnsureAuthorizedOptions } from '../saved_objects';
import { ensureAuthorized, isAuthorizedForObjectInAllSpaces } from '../saved_objects';

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

/** @internal */
export const LEGACY_URL_ALIAS_TYPE = 'legacy-url-alias';

export class SecureSpacesClientWrapper implements ISpacesClient {
  private readonly useRbac: boolean;

  constructor(
    private readonly spacesClient: ISpacesClient,
    private readonly request: KibanaRequest,
    private readonly authorization: AuthorizationServiceSetup,
    private readonly auditLogger: AuditLogger,
    private readonly errors: SavedObjectsClientContract['errors']
  ) {
    this.useRbac = this.authorization.mode.useRbacForRequest(this.request);
  }

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
    const { privileges } = await checkPrivileges.atSpaces(spaceIds, {
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

      this.auditLogger.log(
        spaceAuditEvent({
          action: SpaceAuditAction.FIND,
          error,
        })
      );

      throw error; // Note: there is a catch for this in `SpacesSavedObjectsClient.find`; if we get rid of this error, remove that too
    }

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

  public createSavedObjectFinder(id: string) {
    return this.spacesClient.createSavedObjectFinder(id);
  }

  public async delete(id: string) {
    if (this.useRbac) {
      try {
        await this.ensureAuthorizedGlobally(
          this.authorization.actions.space.manage,
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

    // Fetch saved objects to be removed for audit logging
    if (this.auditLogger.enabled) {
      const finder = this.spacesClient.createSavedObjectFinder(id);
      try {
        for await (const response of finder.find()) {
          response.saved_objects.forEach((savedObject) => {
            const { namespaces = [] } = savedObject;
            const isOnlySpace = namespaces.length === 1; // We can always rely on the `namespaces` field having >=1 element
            if (namespaces.includes(ALL_SPACES_ID) && !namespaces.includes(id)) {
              // This object exists in All Spaces and its `namespaces` field isn't going to change; there's nothing to audit
              return;
            }
            this.auditLogger.log(
              savedObjectEvent({
                action: isOnlySpace
                  ? SavedObjectAction.DELETE
                  : SavedObjectAction.UPDATE_OBJECTS_SPACES,
                outcome: 'unknown',
                savedObject: { type: savedObject.type, id: savedObject.id },
                deleteFromSpaces: [id],
              })
            );
          });
        }
      } finally {
        await finder.close();
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

  public async disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    if (this.useRbac) {
      try {
        const [uniqueSpaces, uniqueTypes, typesAndSpacesMap] = aliases.reduce(
          ([spaces, types, typesAndSpaces], { targetSpace, targetType }) => {
            const spacesForType = typesAndSpaces.get(targetType) ?? new Set();
            return [
              spaces.add(targetSpace),
              types.add(targetType),
              typesAndSpaces.set(targetType, spacesForType.add(targetSpace)),
            ];
          },
          [new Set<string>(), new Set<string>(), new Map<string, Set<string>>()]
        );

        const action = 'bulk_update';
        const { typeActionMap } = await this.ensureAuthorizedForSavedObjects(
          Array.from(uniqueTypes),
          [action],
          Array.from(uniqueSpaces),
          { requireFullAuthorization: false }
        );
        const unauthorizedTypes = new Set<string>();
        for (const type of uniqueTypes) {
          const spaces = Array.from(typesAndSpacesMap.get(type)!);
          if (!isAuthorizedForObjectInAllSpaces(type, action, typeActionMap, spaces)) {
            unauthorizedTypes.add(type);
          }
        }
        if (unauthorizedTypes.size > 0) {
          const targetTypes = Array.from(unauthorizedTypes).sort().join(',');
          const msg = `Unable to disable aliases for ${targetTypes}`;
          throw this.errors.decorateForbiddenError(new Error(msg));
        }
      } catch (error) {
        aliases.forEach((alias) => {
          const id = getAliasId(alias);
          this.auditLogger.log(
            savedObjectEvent({
              action: SavedObjectAction.UPDATE,
              savedObject: { type: LEGACY_URL_ALIAS_TYPE, id },
              error,
            })
          );
        });
        throw error;
      }
    }

    aliases.forEach((alias) => {
      const id = getAliasId(alias);
      this.auditLogger.log(
        savedObjectEvent({
          action: SavedObjectAction.UPDATE,
          outcome: 'unknown',
          savedObject: { type: LEGACY_URL_ALIAS_TYPE, id },
        })
      );
    });

    return this.spacesClient.disableLegacyUrlAliases(aliases);
  }

  private async ensureAuthorizedForSavedObjects<T extends string>(
    types: string[],
    actions: T[],
    namespaces: string[],
    options?: EnsureAuthorizedOptions
  ) {
    const ensureAuthorizedDependencies: EnsureAuthorizedDependencies = {
      actions: this.authorization.actions,
      errors: this.errors,
      checkSavedObjectsPrivilegesAsCurrentUser:
        this.authorization.checkSavedObjectsPrivilegesWithRequest(this.request),
    };
    return ensureAuthorized(ensureAuthorizedDependencies, types, actions, namespaces, options);
  }

  private async ensureAuthorizedGlobally(action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { hasAllRequested } = await checkPrivileges.globally({ kibana: action });

    if (!hasAllRequested) {
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private async ensureAuthorizedAtSpace(spaceId: string, action: string, forbiddenMessage: string) {
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { hasAllRequested } = await checkPrivileges.atSpace(spaceId, {
      kibana: action,
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(forbiddenMessage);
    }
  }

  private filterUnauthorizedSpaceResults(value: GetSpaceResult | null): value is GetSpaceResult {
    return value !== null;
  }
}

/** @internal This is only exported for testing purposes. */
export function getAliasId({ targetSpace, targetType, sourceId }: LegacyUrlAliasTarget) {
  return `${targetSpace}:${targetType}:${sourceId}`;
}
