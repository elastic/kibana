/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/workplace_search';

export type TSpacerSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

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
