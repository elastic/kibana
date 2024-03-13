/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SuggestUserProfilesRequest } from '../../../common/types/api';
import { SuggestUserProfilesRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { LicensingService } from '../licensing';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';

const MAX_PROFILES_SIZE = 100;
const MIN_PROFILES_SIZE = 0;

interface UserProfileOptions {
  securityPluginSetup: SecurityPluginSetup;
  securityPluginStart: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  licensingPluginStart: LicensingPluginStart;
}

export class UserProfileService {
  protected options?: UserProfileOptions;

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

  public async suggest(
    request: KibanaRequest<{}, {}, SuggestUserProfilesRequest>
  ): Promise<UserProfile[]> {
    try {
      const params = decodeWithExcessOrThrow(SuggestUserProfilesRequestRt)(request.body);

      const { name, size, owners } = params;

      this.validateInitialization();

      const licensingService = new LicensingService(
        this.options.licensingPluginStart.license$,
        this.options.licensingPluginStart.featureUsage.notifyUsage
      );

      const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

      if (!hasPlatinumLicenseOrGreater) {
        throw Boom.forbidden(
          'In order to retrieve suggested user profiles, you must be subscribed to an Elastic Platinum license'
        );
      }

      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);

      const { spaces } = this.options;

      UserProfileService.validateSizeParam(size);

      if (!this.isSecurityEnabled() || owners.length <= 0) {
        return [];
      }

      return UserProfileService.suggestUsers({
        searchTerm: name,
        size,
        owners,
        securityPluginStart: this.options.securityPluginStart,
        spaceId: spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
      });
    } catch (error) {
      throw createCaseError({
        logger: this.logger,
        message: `Failed to retrieve suggested user profiles in service: ${error}`,
        error,
      });
    }
  }

  private validateInitialization(): asserts this is this & { options: UserProfileOptions } {
    if (this.options == null) {
      throw new Error('UserProfileService must be initialized before calling suggest');
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

  private isSecurityEnabled() {
    this.validateInitialization();

    return this.options.securityPluginSetup.license.isEnabled();
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
      privileges.push(security.authz.actions.cases.get(owner, Operations.getCase.name));
    }

    return privileges;
  }
}
