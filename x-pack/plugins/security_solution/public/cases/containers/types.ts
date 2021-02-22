/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  User,
  UserActionField,
  UserAction,
  CaseConnector,
  CommentRequest,
  CaseStatuses,
  CaseAttributes,
  CasePatchRequest,
  CaseType,
  AssociationType,
} from '../../../../case/common/api';

export { CaseConnector, ActionConnector, CaseStatuses } from '../../../../case/common/api';

export type AllCaseType = AssociationType & CaseType;

export type Comment = CommentRequest & {
  associationType: AssociationType;
  id: string;
  createdAt: string;
  createdBy: ElasticUser;
  pushedAt: string | null;
  pushedBy: string | null;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
  version: string;
};
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

interface BasicCase {
  id: string;
  closedAt: string | null;
  closedBy: ElasticUser | null;
  comments: Comment[];
  createdAt: string;
  createdBy: ElasticUser;
  status: CaseStatuses;
  title: string;
  totalAlerts: number;
  totalComment: number;
  updatedAt: string | null;
  updatedBy: ElasticUser | null;
  version: string;
}

export interface SubCase extends BasicCase {
  associationType: AssociationType;
  caseParentId: string;
}

export interface Case extends BasicCase {
  connector: CaseConnector;
  description: string;
  externalService: CaseExternalService | null;
  subCases?: SubCase[] | null;
  subCaseIds: string[];
  settings: CaseAttributes['settings'];
  tags: string[];
  type: CaseType;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  search: string;
  status: CaseStatuses;
  tags: string[];
  reporters: User[];
}

export interface CasesStatus {
  countClosedCases: number | null;
  countOpenCases: number | null;
  countInProgressCases: number | null;
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
  updatedAt = 'updatedAt',
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
  type?: CaseType;
}

export interface FieldMappings {
  id: string;
  title?: string;
}

export type UpdateKey = keyof Pick<
  CasePatchRequest,
  'connector' | 'description' | 'status' | 'tags' | 'title' | 'settings'
>;

export interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: CasePatchRequest[UpdateKey];
  fetchCaseUserActions?: (caseId: string, subCaseId?: string) => void;
  updateCase?: (newCase: Case) => void;
  caseData: Case;
  onSuccess?: () => void;
  onError?: () => void;
}
