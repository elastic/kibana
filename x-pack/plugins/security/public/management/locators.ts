/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { SECURITY_MANAGEMENT_LOCATOR } from '../../common/constants';

export type SecurityManagementLocator = LocatorPublic<SecurityManagementLocatorParams>;

export interface SecurityManagementLocatorParams extends SerializableRecord {
  appId?: string;
}

export class SecurityManagementLocatorDefinition
  implements LocatorDefinition<SecurityManagementLocatorParams>
{
  public readonly id = SECURITY_MANAGEMENT_LOCATOR;

  public readonly getLocation = async ({
    appId,
  }: SecurityManagementLocatorParams): Promise<KibanaLocation> => {
    let path: string;

    switch (appId) {
      case 'roles':
        path = '/security/roles';
        break;
      case 'api_keys':
        path = '/security/api_keys';
        break;
      case 'role_mappings':
        path = '/security/role_mappings';
        break;
      case 'users':
      default:
        path = '/security/users';
    }

    return {
      app: 'management',
      path,
      state: {},
    };
  };
}
