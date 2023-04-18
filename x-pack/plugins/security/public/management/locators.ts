/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { SECURITY_MANAGEMENT_LOCATOR } from '../../common/constants';

interface LocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export type SecurityManagementLocator = LocatorPublic<SecurityManagementLocatorParams>;

export interface SecurityManagementLocatorParams extends SerializableRecord {
  appId?: string;
}

export class SecurityManagementLocatorDefinition
  implements LocatorDefinition<SecurityManagementLocatorParams>
{
  constructor(protected readonly deps: LocatorDefinitionDependencies) {}

  public readonly id = SECURITY_MANAGEMENT_LOCATOR;

  public readonly getLocation = async ({
    appId,
  }: SecurityManagementLocatorParams): Promise<KibanaLocation> => {
    let app: string;

    switch (appId) {
      case 'roles':
        app = 'roles';
        break;
      case 'api_keys':
        app = 'api_keys';
        break;
      case 'role_mappings':
        app = 'role_mappings';
        break;
      case 'users':
      default:
        app = 'users';
    }

    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'security',
      appId: app,
    });

    return location;
  };
}
