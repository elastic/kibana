/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssociationType,
  CaseAttributes,
  CaseConnector,
  CasePatchRequest,
  CaseStatuses,
  CaseType,
  CommentRequest,
  User,
  UserAction,
  UserActionField,
  ActionConnector,
} from '../api';

export interface CasesUiConfigType {
  markdownPlugins: {
    lens: boolean;
  };
}

export const StatusAll = 'all' as const;
export type StatusAllType = typeof StatusAll;

export type CaseStatusWithAllStatus = CaseStatuses | StatusAllType;

/**
 * The type for the `refreshRef` prop (a `React.Ref`) defined by the `CaseViewComponentProps`.
 *
 * @example
 * const refreshRef = useRef<CaseViewRefreshPropInterface>(null);
 * return <CaseComponent refreshRef={refreshRef} ...otherProps>
 */
export type CaseViewRefreshPropInterface = null | {
  /**
   * Refreshes the all of the user actions/comments in the view's timeline
   * (note: this also triggers a silent `refreshCase()`)
   */
  refreshUserActionsAndComments: () => Promise<void>;
  /** Refreshes the Case information only */
  refreshCase: () => Promise<void>;
};

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
  newValConnectorId: string | null;
  oldValue: string | null;
  oldValConnectorId: string | null;
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
  owner: string;
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

export interface ResolvedCase {
  case: Case;
  outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
  aliasTargetId?: string;
}

export interface QueryParams {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  search: string;
  status: CaseStatusWithAllStatus;
  tags: string[];
  reporters: User[];
  onlyCollectionType?: boolean;
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
}

export interface ElasticUser {
  readonly email?: string | null;
  readonly fullName?: string | null;
  readonly username?: string | null;
}

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
  type: CaseType | null;
  title: string;
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
  fetchCaseUserActions?: (caseId: string, caseConnectorId: string, subCaseId?: string) => void;
  updateCase?: (newCase: Case) => void;
  caseData: Case;
  onSuccess?: () => void;
  onError?: () => void;
}

export interface RuleEcs {
  id?: string[];
  rule_id?: string[];
  name?: string[];
  false_positives: string[];
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
