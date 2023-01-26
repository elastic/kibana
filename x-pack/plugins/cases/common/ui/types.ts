/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import type {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
} from '..';
import type {
  CasePatchRequest,
  CaseStatuses,
  User,
  ActionConnector,
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
  GetCaseConnectorsResponse,
} from '../api';
import type { PUSH_CASES_CAPABILITY } from '../constants';
import type { SnakeToCamelCase } from '../types';

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
export type Case = Omit<SnakeToCamelCase<CaseResponse>, 'comments'> & { comments: Comment[] };
export type Cases = Omit<SnakeToCamelCase<CasesFindResponse>, 'cases'> & { cases: Case[] };
export type CasesStatus = SnakeToCamelCase<CasesStatusResponse>;
export type CasesMetrics = SnakeToCamelCase<CasesMetricsResponse>;
export type CaseUpdateRequest = SnakeToCamelCase<CasePatchRequest>;
export type CaseConnectors = SnakeToCamelCase<GetCaseConnectorsResponse>;

export interface ResolvedCase {
  case: Case;
  outcome: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
}

export interface SortingParams {
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface QueryParams extends SortingParams {
  page: number;
  perPage: number;
}
export type PartialQueryParams = Partial<QueryParams>;

export interface UrlQueryParams extends SortingParams {
  page: string;
  perPage: string;
}

export interface ParsedUrlQueryParams extends Partial<UrlQueryParams> {
  [index: string]: string | string[] | undefined | null;
}

export type LocalStorageQueryParams = Partial<Omit<QueryParams, 'page'>>;

export interface FilterOptions {
  search: string;
  searchFields: string[];
  severity: CaseSeverityWithAll;
  status: CaseStatusWithAllStatus;
  tags: string[];
  assignees: Array<string | null> | null;
  reporters: User[];
  owner: string[];
}
export type PartialFilterOptions = Partial<FilterOptions>;

export type SingleCaseMetrics = SingleCaseMetricsResponse;
export type SingleCaseMetricsFeature =
  | 'alerts.count'
  | 'alerts.users'
  | 'alerts.hosts'
  | 'actions.isolateHost'
  | 'connectors'
  | 'lifespan';

export enum SortFieldCase {
  closedAt = 'closedAt',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  severity = 'severity',
  status = 'status',
  title = 'title',
}

export type ElasticUser = SnakeToCamelCase<User>;

export interface FetchCasesProps extends ApiProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}

export interface ApiProps {
  signal: AbortSignal;
}

export interface ActionLicense {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
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
