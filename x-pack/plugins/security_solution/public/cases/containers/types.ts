/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User, UserActionField, UserAction } from '../../../../case/common/api';

export interface Comment {
  id: string;
  createdAt: string;
  createdBy: ElasticUser;
  comment: string;
  pushedAt: string | null;
  pushedBy: string | null;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
  version: string;
}
export interface CaseUserActions {
  actionId: string;
  actionField: UserActionField;
  action: UserAction;
  actionAt: string;
  actionBy: ElasticUser;
  caseId: string;
  commentId: string | null;
  newValue: string | null;
  oldValue: string | null;
}

export interface CaseExternalService {
  pushedAt: string;
  pushedBy: ElasticUser;
  connectorId: string;
  connectorName: string;
  externalId: string;
  externalTitle: string;
  externalUrl: string;
}
export interface Case {
  id: string;
  closedAt: string | null;
  closedBy: ElasticUser | null;
  comments: Comment[];
  connectorId: string;
  createdAt: string;
  createdBy: ElasticUser;
  description: string;
  externalService: CaseExternalService | null;
  status: string;
  tags: string[];
  title: string;
  totalComment: number;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
  version: string;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  search: string;
  status: string;
  tags: string[];
  reporters: User[];
}

export interface CasesStatus {
  countClosedCases: number | null;
  countOpenCases: number | null;
}

export interface AllCases extends CasesStatus {
  cases: Case[];
  page: number;
  perPage: number;
  total: number;
}

export enum SortFieldCase {
  createdAt = 'createdAt',
  closedAt = 'closedAt',
}

export interface ElasticUser {
  readonly email?: string | null;
  readonly fullName?: string | null;
  readonly username?: string | null;
}

export interface FetchCasesProps extends ApiProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}

export interface ApiProps {
  signal: AbortSignal;
}

export interface BulkUpdateStatus {
  status: string;
  id: string;
  version: string;
}
export interface ActionLicense {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
}

export interface DeleteCase {
  id: string;
  title?: string;
}
