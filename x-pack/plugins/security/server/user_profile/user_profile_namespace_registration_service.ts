/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserSettingsNamespaceRegistrationService as UserSettingsNamespaceRegistrationServiceInterface } from '@kbn/security-plugin-types-server/src/user_profile';

export class UserSettingsNamespaceRegistrationService
  implements UserSettingsNamespaceRegistrationServiceInterface
{
  registeredNamespaces: string[];

  constructor() {
    this.registeredNamespaces = [];
  }

  public registerNamespace(nameSpace: string) {
    this.registeredNamespaces.push(nameSpace);
  }

  public getRegisteredNamespaces() {
    return this.registeredNamespaces;
  }
}

const namespaceRegistrationService = new UserSettingsNamespaceRegistrationService();

export function getUserSettingNamespaceRegistrationService() {
  return namespaceRegistrationService;
}
