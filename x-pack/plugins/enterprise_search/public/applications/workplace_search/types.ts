/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/workplace_search';

export type SpacerSizeTypes = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  contentSources: ContentSource[];
  users: User[];
  usersCount: number;
  color?: string;
}

export interface GroupDetails extends Group {
  contentSources: ContentSourceDetails[];
  canEditGroup: boolean;
  canDeleteGroup: boolean;
}

export interface User {
  id: string;
  name: string | null;
  initials: string;
  pictureUrl: string | null;
  color: string;
  email: string;
  role?: string;
  groupIds: string[];
}

export interface ContentSource {
  id: string;
  serviceType: string;
  name: string;
}

export interface ContentSourceDetails extends ContentSource {
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

export interface SourcePriority {
  [id: string]: number;
}
