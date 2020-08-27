/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IAccount {
  id: string;
  groups: string[];
  isAdmin: boolean;
  isCurated: boolean;
  canCreatePersonalSources: boolean;
  viewedOnboardingPage: boolean;
}

export interface IOrganization {
  name: string;
  defaultOrgName: string;
}

export interface IWorkplaceSearchInitialData {
  canCreateInvitations: boolean;
  isFederatedAuth: boolean;
  organization: IOrganization;
  fpAccount: IAccount;
}
