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
  canCreateInvitations?: boolean;
  viewedOnboardingPage: boolean;
}

export interface IOrganization {
  name: string;
  defaultOrgName: string;
}

export interface IWorkplaceSearchInitialData {
  organization: IOrganization;
  account: IAccount;
}

export interface IConfiguredLimits {
  customApiSource: {
    maxDocumentByteSize: number;
    totalFields: number;
  };
}

export interface IGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  contentSources: IContentSource[];
  users: IUser[];
  usersCount: number;
  color?: string;
}

export interface IGroupDetails extends IGroup {
  contentSources: IContentSourceDetails[];
  canEditGroup: boolean;
  canDeleteGroup: boolean;
}

export interface IUser {
  id: string;
  name: string | null;
  initials: string;
  pictureUrl: string | null;
  color: string;
  email: string;
  role?: string;
  groupIds: string[];
}

export interface IContentSource {
  id: string;
  serviceType: string;
  name: string;
}

export interface IContentSourceDetails extends IContentSource {
  status: string;
  statusMessage: string;
  documentCount: string;
  isFederatedSource: boolean;
  searchable: boolean;
  supportedByLicense: boolean;
  errorReason: number;
  allowsReauth: boolean;
  boost: number;
}

export interface IGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  contentSources: IContentSource[];
  users: IUser[];
  usersCount: number;
  color?: string;
}

export interface IGroupDetails extends IGroup {
  contentSources: IContentSourceDetails[];
  canEditGroup: boolean;
  canDeleteGroup: boolean;
}

export interface IUser {
  id: string;
  name: string | null;
  initials: string;
  pictureUrl: string | null;
  color: string;
  email: string;
  role?: string;
  groupIds: string[];
}

export interface IContentSource {
  id: string;
  serviceType: string;
  name: string;
}

export interface IContentSourceDetails extends IContentSource {
  status: string;
  statusMessage: string;
  documentCount: string;
  isFederatedSource: boolean;
  searchable: boolean;
  supportedByLicense: boolean;
  errorReason: number;
  allowsReauth: boolean;
  boost: number;
}
