/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IAccount {
  accountId: string;
  onBoardingComplete: boolean;
  role: IRole;
}

export interface IRole {
  id: string;
  roleType: string;
  ability: {
    accessAllEngines: boolean;
    destroy: string[];
    manage: string[];
    edit: string[];
    view: string[];
    credentialTypes: string[];
    availableRoleTypes: string[];
  };
}
