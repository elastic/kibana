/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { KibanaRequest, Logger } from '@kbn/core/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfile } from '@kbn/security-plugin/common';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { excess, SuggestUserProfilesRequestRt, throwErrors } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';

const MAX_PROFILES_SIZE = 100;
const MIN_PROFILES_SIZE = 0;

interface UserProfileOptions {
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export class UserProfileService {
  private options?: UserProfileOptions;

  constructor(private readonly logger: Logger) {}

  public initialize(options: UserProfileOptions) {
    if (this.options !== undefined) {
      throw new Error('UserProfileService was already initialized');
    }

    this.options = options;
  }

  private static suggestUsers({
    securityPluginStart,
    spaceId,
    searchTerm,
    size,
    owners,
  }: {
    securityPluginStart: SecurityPluginStart;
    spaceId: string;
    searchTerm: string;
    size?: number;
    owners: string[];
  }) {
    return securityPluginStart.userProfiles.suggest({
      name: searchTerm,
      size,
      dataPath: 'avatar',
      requiredPrivileges: {
        spaceId,
        privileges: {
          kibana: UserProfileService.buildRequiredPrivileges(owners, securityPluginStart),
        },
      },
    });
  }

  public async suggest(request: KibanaRequest): Promise<UserProfile[]> {
    const params = pipe(
      excess(SuggestUserProfilesRequestRt).decode(request.body),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { name, size, owners } = params;

    try {
      if (this.options === undefined) {
        throw new Error('UserProfileService must be initialized before calling suggest');
      }

      const { spaces } = this.options;

      const securityPluginFields = {
        securityPluginSetup: this.options.securityPluginSetup,
        securityPluginStart: this.options.securityPluginStart,
      };

      UserProfileService.validateSizeParam(size);

      if (!UserProfileService.isSecurityEnabled(securityPluginFields) || owners.length <= 0) {
        return [];
      }

      const { securityPluginStart } = securityPluginFields;

      return UserProfileService.suggestUsers({
        searchTerm: name,
        size,
        owners,
        securityPluginStart,
        spaceId: spaces.spacesService.getSpaceId(request),
      });
    } catch (error) {
      throw createCaseError({
        logger: this.logger,
        message: `Failed to retrieve suggested user profiles in service for name: ${name} owners: [${owners}]: ${error}`,
        error,
      });
    }
  }

  private static validateSizeParam(size?: number) {
    /**
     * The limit of 100 helps prevent DDoS attacks and is also enforced by the security plugin.
     */
    if (size !== undefined && (size > MAX_PROFILES_SIZE || size < MIN_PROFILES_SIZE)) {
      throw Boom.badRequest('size must be between 0 and 100');
    }
  }

  private static isSecurityEnabled(fields: {
    securityPluginSetup?: SecurityPluginSetup;
    securityPluginStart?: SecurityPluginStart;
  }): fields is {
    securityPluginSetup: SecurityPluginSetup;
    securityPluginStart: SecurityPluginStart;
  } {
    const { securityPluginSetup, securityPluginStart } = fields;

    return (
      securityPluginStart !== undefined &&
      securityPluginSetup !== undefined &&
      securityPluginSetup.license.isEnabled()
    );
  }

  /**
   * This function constructs the privileges required for a user to be assigned to a case. We're requiring the ability
   * to read and update a case saved object. My thought process was that a user should at a minimum be able to read it
   * and change its status to close it. This is does not require that the user have access to comments or various other
   * privileges around the other entities within cases. If we move to a more granular object level permissions we'll
   * likely need to expand this to include the privileges for the other entities as well.
   */
  private static buildRequiredPrivileges(owners: string[], security: SecurityPluginStart) {
    const privileges: string[] = [];
    for (const owner of owners) {
      for (const operation of [Operations.updateCase.name, Operations.getCase.name]) {
        privileges.push(security.authz.actions.cases.get(owner, operation));
      }
    }

    return privileges;
  }
}
