/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Account {
  id: string;
  groups: string[];
  isAdmin: boolean;
  isCurated: boolean;
  canCreatePersonalSources: boolean;
  canCreateInvitations?: boolean;
  viewedOnboardingPage: boolean;
}

export interface Organization {
  name: string;
  defaultOrgName: string;
}

export interface WorkplaceSearchInitialData {
  organization: Organization;
  account: Account;
}

export interface ConfiguredLimits {
  customApiSource: {
    maxDocumentByteSize: number;
    totalFields: number;
  };
}
