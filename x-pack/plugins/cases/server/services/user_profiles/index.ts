/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { SuggestUserProfilesRequest } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';

interface UserProfileOptions {
  log: Logger;
  request: KibanaRequest;
  security?: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export class UserProfileService {
  constructor(private readonly options: UserProfileOptions) {}

  public async suggest(request: SuggestUserProfilesRequest) {
    try {
      const { security, spaces, request: kbnRequest } = this.options;

      if (!security) {
        return [];
      }

      return security.userProfiles.suggest({
        name: request.name,
        size: request.size,
        dataPath: 'avatar',
        requiredPrivileges: {
          spaceId: spaces.spacesService.getSpaceId(kbnRequest),
          privileges: {
            kibana: this.buildRequiredPrivileges(request.owners),
          },
        },
      });
    } catch (error) {
      throw createCaseError({
        logger: this.options.log,
        message: `Failed to retrieve suggested user profiles in service for name: ${
          request.name
        } owners: [${request.owners.join(',')}]`,
      });
    }
  }

  private buildRequiredPrivileges(owners: string[]) {
    if (!this.options.security) {
      return [];
    }

    const privileges: string[] = [];
    for (const owner of owners) {
      for (const operation of [Operations.updateCase.name, Operations.getCase.name]) {
        privileges.push(this.options.security.authz.actions.cases.get(owner, operation));
      }
    }

    return privileges;
  }
}
