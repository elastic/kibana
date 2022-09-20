/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '..';
import {
  CasePatchRequest,
  CaseStatuses,
  User,
  ActionConnector,
  CaseExternalServiceBasic,
  CaseUserActionResponse,
  SingleCaseMetricsResponse,
  CommentResponse,
  CaseResponse,
  CommentResponseAlertsType,
  CasesFindResponse,
  CasesStatusResponse,
  CasesMetricsResponse,
  CaseSeverity,
  CommentResponseExternalReferenceType,
  CommentResponseTypePersistableState,
} from '../api';
import { PUSH_CASES_CAPABILITY } from '../constants';
import { SnakeToCamelCase } from '../types';

type DeepRequired<T> = { [K in keyof T]: DeepRequired<T[K]> } & Required<T>;

export interface CasesContextFeatures {
  alerts: { sync?: boolean; enabled?: boolean; isExperimental?: boolean };
  metrics: SingleCaseMetricsFeature[];
}

export type CasesFeaturesAllRequired = DeepRequired<CasesContextFeatures>;

export type CasesFeatures = Partial<CasesContextFeatures>;

export interface CasesUiConfigType {
  markdownPlugins: {
    lens: boolean;
  };
}

export const StatusAll = 'all' as const;
export type StatusAllType = typeof StatusAll;

export type CaseStatusWithAllStatus = CaseStatuses | StatusAllType;

export const SeverityAll = 'all' as const;
export type CaseSeverityWithAll = CaseSeverity | typeof SeverityAll;

/**
 * The type for the `refreshRef` prop (a `React.Ref`) defined by the `CaseViewComponentProps`.
 *
 * @example
 * const refreshRef = useRef<CaseViewRefreshPropInterface>(null);
 * return <CaseComponent refreshRef={refreshRef} ...otherProps>
 */
export type CaseViewRefreshPropInterface = null | {
  /**
   * Refreshes the case its metrics and user actions/comments in the view's timeline
   */
  refreshCase: () => Promise<void>;
};

export type Comment = SnakeToCamelCase<CommentResponse>;
export type AlertComment = SnakeToCamelCase<CommentResponseAlertsType>;
export type ExternalReferenceComment = SnakeToCamelCase<CommentResponseExternalReferenceType>;
export type PersistableComment = SnakeToCamelCase<CommentResponseTypePersistableState>;
export type CaseUserActions = SnakeToCamelCase<CaseUserActionResponse>;
export type CaseExternalService = SnakeToCamelCase<CaseExternalServiceBasic>;
export type Case = Omit<SnakeToCamelCase<CaseResponse>, 'comments'> & { comments: Comment[] };
export type Cases = Omit<SnakeToCamelCase<CasesFindResponse>, 'cases'> & { cases: Case[] };
export type CasesStatus = SnakeToCamelCase<CasesStatusResponse>;
export type CasesMetrics = SnakeToCamelCase<CasesMetricsResponse>;

export interface ResolvedCase {
  case: Case;
  outcome: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  search: string;
  searchFields: string[];
  severity: CaseSeverityWithAll;
  status: CaseStatusWithAllStatus;
  tags: string[];
  assignees: string[];
  reporters: User[];
  owner: string[];
}

export type SingleCaseMetrics = SingleCaseMetricsResponse;
export type SingleCaseMetricsFeature =
  | 'alerts.count'
  | 'alerts.users'
  | 'alerts.hosts'
  | 'actions.isolateHost'
  | 'connectors'
  | 'lifespan';

export enum SortFieldCase {
  createdAt = 'createdAt',
  closedAt = 'closedAt',
}

export type ElasticUser = SnakeToCamelCase<User>;

export interface FetchCasesProps extends ApiProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions & { owner: string[] };
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
  title: string;
}

export interface FieldMappings {
  id: string;
  title?: string;
}

export type UpdateKey = keyof Pick<
  CasePatchRequest,
  'connector' | 'description' | 'status' | 'tags' | 'title' | 'settings' | 'severity' | 'assignees'
>;

export interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: CasePatchRequest[UpdateKey];
  caseData: Case;
  onSuccess?: () => void;
  onError?: () => void;
}

export interface RuleEcs {
  id?: string[];
  rule_id?: string[];
  name?: string[];
  false_positives?: string[];
  saved_id?: string[];
  timeline_id?: string[];
  timeline_title?: string[];
  max_signals?: number[];
  risk_score?: string[];
  output_index?: string[];
  description?: string[];
  from?: string[];
  immutable?: boolean[];
  index?: string[];
  interval?: string[];
  language?: string[];
  query?: string[];
  references?: string[];
  severity?: string[];
  tags?: string[];
  threat?: unknown;
  threshold?: unknown;
  type?: string[];
  size?: string[];
  to?: string[];
  enabled?: boolean[];
  filters?: unknown;
  created_at?: string[];
  updated_at?: string[];
  created_by?: string[];
  updated_by?: string[];
  version?: string[];
  note?: string[];
  building_block_type?: string[];
}

export interface SignalEcs {
  rule?: RuleEcs;
  original_time?: string[];
  status?: string[];
  group?: {
    id?: string[];
  };
  threshold_result?: unknown;
}

export type SignalEcsAAD = Exclude<SignalEcs, 'rule' | 'status'> & {
  rule?: Exclude<RuleEcs, 'id'> & { parameters: Record<string, unknown>; uuid: string[] };
  building_block_type?: string[];
  workflow_status?: string[];
};

export interface Ecs {
  _id: string;
  _index?: string;
  signal?: SignalEcs;
  kibana?: {
    alert: SignalEcsAAD;
  };
}

export type CaseActionConnector = ActionConnector;

export type UseFetchAlertData = (alertIds: string[]) => [boolean, Record<string, unknown>];

export interface CasesPermissions {
  all: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  push: boolean;
}

export interface CasesCapabilities {
  [CREATE_CASES_CAPABILITY]: boolean;
  [READ_CASES_CAPABILITY]: boolean;
  [UPDATE_CASES_CAPABILITY]: boolean;
  [DELETE_CASES_CAPABILITY]: boolean;
  [PUSH_CASES_CAPABILITY]: boolean;
}
