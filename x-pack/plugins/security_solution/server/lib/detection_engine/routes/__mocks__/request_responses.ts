/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import type { SanitizedRule, ResolvedSanitizedRule } from '@kbn/alerting-plugin/common';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_BULK_UPDATE,
  DETECTION_ENGINE_RULES_BULK_DELETE,
  DETECTION_ENGINE_RULES_BULK_CREATE,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '../../../../../common/constants';
import { RULE_MANAGEMENT_FILTERS_URL } from '../../../../../common/api/detection_engine/rule_management/urls';

import {
  PREBUILT_RULES_STATUS_URL,
  PREBUILT_RULES_URL,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import {
  getPerformBulkActionSchemaMock,
  getPerformBulkActionEditSchemaMock,
} from '../../../../../common/api/detection_engine/rule_management/mocks';

import { getCreateRulesSchemaMock } from '../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type {
  QuerySignalsSchemaDecoded,
  SetSignalsStatusSchemaDecoded,
} from '../../../../../common/api/detection_engine/signals';
import {
  getFinalizeSignalsMigrationSchemaMock,
  getSignalsMigrationStatusSchemaMock,
} from '../../../../../common/api/detection_engine/signals_migration/mocks';

// eslint-disable-next-line no-restricted-imports
import type { LegacyRuleNotificationRuleType } from '../../rule_actions_legacy';
import type { RuleAlertType, RuleParams } from '../../rule_schema';
import { getQueryRuleParams } from '../../rule_schema/mocks';

import { requestMock } from './request';
import type { HapiReadableStream } from '../../../../types';

export const typicalSetStatusSignalByIdsPayload = (): SetSignalsStatusSchemaDecoded => ({
  signal_ids: ['somefakeid1', 'somefakeid2'],
  status: 'closed',
});

export const typicalSetStatusSignalByQueryPayload = (): SetSignalsStatusSchemaDecoded => ({
  query: { bool: { filter: { range: { '@timestamp': { gte: 'now-2M', lte: 'now/M' } } } } },
  status: 'closed',
});

export const typicalSignalsQuery = (): QuerySignalsSchemaDecoded => ({
  aggs: {},
  query: { match_all: {} },
});

export const typicalSignalsQueryAggs = (): QuerySignalsSchemaDecoded => ({
  aggs: { statuses: { terms: { field: ALERT_WORKFLOW_STATUS, size: 10 } } },
});

export const setStatusSignalMissingIdsAndQueryPayload = (): SetSignalsStatusSchemaDecoded => ({
  status: 'closed',
});

export const getUpdateRequest = () =>
  requestMock.create({
    method: 'put',
    path: DETECTION_ENGINE_RULES_URL,
    body: getCreateRulesSchemaMock(),
  });

export const getPatchRequest = () =>
  requestMock.create({
    method: 'patch',
    path: DETECTION_ENGINE_RULES_URL,
    body: getCreateRulesSchemaMock(),
  });

export const getReadRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_RULES_URL,
    query: { rule_id: 'rule-1' },
  });

export const getReadRequestWithId = (id: string) =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_RULES_URL,
    query: { id },
  });

export const getFindRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_RULES_URL_FIND,
  });

export const getReadBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_BULK_CREATE,
    body: [getCreateRulesSchemaMock()],
  });

export const getUpdateBulkRequest = () =>
  requestMock.create({
    method: 'put',
    path: DETECTION_ENGINE_RULES_BULK_UPDATE,
    body: [getCreateRulesSchemaMock()],
  });

export const getPatchBulkRequest = () =>
  requestMock.create({
    method: 'patch',
    path: DETECTION_ENGINE_RULES_BULK_UPDATE,
    body: [getCreateRulesSchemaMock()],
  });

export const getBulkActionRequest = () =>
  requestMock.create({
    method: 'patch',
    path: DETECTION_ENGINE_RULES_BULK_ACTION,
    body: getPerformBulkActionSchemaMock(),
  });

export const getBulkActionEditRequest = () =>
  requestMock.create({
    method: 'patch',
    path: DETECTION_ENGINE_RULES_BULK_ACTION,
    body: getPerformBulkActionEditSchemaMock(),
  });

export const getDeleteBulkRequest = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    body: [{ rule_id: 'rule-1' }],
  });

export const getDeleteBulkRequestById = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    body: [{ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequestById = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    body: [{ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    body: [{ rule_id: 'rule-1' }],
  });

export const getPrivilegeRequest = (options: { auth?: { isAuthenticated: boolean } } = {}) =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_PRIVILEGES_URL,
    ...options,
  });

export const addPrepackagedRulesRequest = () =>
  requestMock.create({
    method: 'put',
    path: PREBUILT_RULES_URL,
  });

export const getPrepackagedRulesStatusRequest = () =>
  requestMock.create({
    method: 'get',
    path: PREBUILT_RULES_STATUS_URL,
  });

export const getRuleManagementFiltersRequest = () =>
  requestMock.create({
    method: 'get',
    path: RULE_MANAGEMENT_FILTERS_URL,
  });

export interface FindHit<T = RuleAlertType> {
  page: number;
  perPage: number;
  total: number;
  data: T[];
}

export const getEmptyFindResult = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: [],
});

export const getFindResultWithSingleHit = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getRuleMock(getQueryRuleParams())],
});

export const nonRuleFindResult = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [nonRuleAlert()],
});

export const getFindResultWithMultiHits = ({
  data,
  page = 1,
  perPage = 1,
  total,
}: {
  data: RuleAlertType[];
  page?: number;
  perPage?: number;
  total?: number;
}) => {
  return {
    page,
    perPage,
    total: total != null ? total : data.length,
    data,
  };
};

export const getImportRulesRequest = (hapiStream?: HapiReadableStream) =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    body: { file: hapiStream },
  });

export const getImportRulesRequestOverwriteTrue = (hapiStream?: HapiReadableStream) =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_import`,
    body: { file: hapiStream },
    query: { overwrite: true },
  });

export const getDeleteRequest = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_URL,
    query: { rule_id: 'rule-1' },
  });

export const getDeleteRequestById = () =>
  requestMock.create({
    method: 'delete',
    path: DETECTION_ENGINE_RULES_URL,
    query: { id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' },
  });

export const getCreateRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_URL,
    body: getCreateRulesSchemaMock(),
  });

// TODO: Replace this with the mocks version from the mocks file
export const typicalMlRulePayload = () => {
  const { query, language, index, ...mlParams } = getCreateRulesSchemaMock();

  return {
    ...mlParams,
    type: 'machine_learning',
    anomaly_threshold: 58,
    machine_learning_job_id: 'typical-ml-job-id',
  };
};

export const createMlRuleRequest = () => {
  return requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_URL,
    body: typicalMlRulePayload(),
  });
};

export const createBulkMlRuleRequest = () => {
  return requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_URL,
    body: [typicalMlRulePayload()],
  });
};

export const getSetSignalStatusByIdsRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
    body: typicalSetStatusSignalByIdsPayload(),
  });

export const getSetSignalStatusByQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
    body: typicalSetStatusSignalByQueryPayload(),
  });

export const getSignalsQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: typicalSignalsQuery(),
  });

export const getSignalsAggsQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: typicalSignalsQueryAggs(),
  });

export const getSignalsAggsAndQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    body: { ...typicalSignalsQuery(), ...typicalSignalsQueryAggs() },
  });

export const nonRuleAlert = () => ({
  // Defaulting to QueryRuleParams because ts doesn't like empty objects
  ...getRuleMock(getQueryRuleParams()),
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bc',
  name: 'Non-Rule Alert',
  alertTypeId: 'something',
});

export const getRuleMock = <T extends RuleParams>(
  params: T,
  rewrites?: Partial<SanitizedRule<T>>
): SanitizedRule<T> => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [],
  alertTypeId: ruleTypeMappings[params.type],
  consumer: 'siem',
  params,
  createdAt: new Date('2019-12-13T16:40:33.400Z'),
  updatedAt: new Date('2019-12-13T16:40:33.400Z'),
  schedule: { interval: '5m' },
  enabled: true,
  actions: [],
  throttle: null,
  notifyWhen: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '2dabe330-0702-11ea-8b50-773b89126888',
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
  ...rewrites,
});

export const resolveRuleMock = <T extends RuleParams>(params: T): ResolvedSanitizedRule<T> => ({
  outcome: 'exactMatch',
  ...getRuleMock(params),
});

export const getMockPrivilegesResult = () => ({
  username: 'test-space',
  has_all_requested: false,
  cluster: {
    monitor_ml: true,
    manage_index_templates: true,
    monitor_transform: true,
    manage_api_key: false,
    manage_security: false,
    manage_own_api_key: false,
    all: false,
    monitor: true,
    manage: true,
    manage_transform: true,
    manage_ml: true,
    manage_pipeline: true,
  },
  index: {
    '.siem-signals-test-space': {
      all: false,
      read: false,
      create_index: true,
      index: false,
      monitor: true,
      delete: false,
      manage: true,
      delete_index: true,
      create_doc: false,
      view_index_metadata: true,
      create: false,
      write: false,
    },
  },
  application: {},
});

export const getEmptySavedObjectsResponse = (): SavedObjectsFindResponse => ({
  page: 1,
  per_page: 1,
  total: 0,
  saved_objects: [],
});

export const getBasicEmptySearchResponse = (): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: [],
    total: { relation: 'eq', value: 0 },
    max_score: 0,
  },
});

export const getBasicNoShardsSearchResponse = (): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
  hits: {
    hits: [],
    total: { relation: 'eq', value: 0 },
    max_score: 0,
  },
});

export const getEmptySignalsResponse = (): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
  aggregations: {
    alertsByGrouping: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
  },
});

export const getSuccessfulSignalUpdateResponse = (): estypes.UpdateByQueryResponse => ({
  took: 18,
  timed_out: false,
  total: 1,
  updated: 1,
  deleted: 0,
  batches: 1,
  version_conflicts: 0,
  noops: 0,
  retries: { bulk: 0, search: 0 },
  throttled_millis: 0,
  requests_per_second: -1,
  throttled_until_millis: 0,
  failures: [],
});

export const getFinalizeSignalsMigrationRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
    body: getFinalizeSignalsMigrationSchemaMock(),
  });

export const getSignalsMigrationStatusRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
    query: getSignalsMigrationStatusSchemaMock(),
  });

export const getMockUserProfiles = () => [
  { uid: 'default-test-assignee-id-1', enabled: true, user: { username: 'user1' }, data: {} },
  { uid: 'default-test-assignee-id-2', enabled: true, user: { username: 'user2' }, data: {} },
];

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetNotificationResult = ({
  id = '456',
  ruleId = '123',
}: {
  id?: string;
  ruleId?: string;
} = {}): LegacyRuleNotificationRuleType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '5m',
  },
  enabled: true,
  actions: [
    {
      actionTypeId: '.slack',
      params: {
        message:
          'Rule generated {{state.signals_count}} signals\n\n{{context.rule.name}}\n{{{context.results_link}}}',
      },
      group: 'default',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: null,
  apiKey: null,
  apiKeyOwner: 'elastic',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: new Date('2020-03-21T11:15:13.530Z'),
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '62b3a130-6b70-11ea-9ce9-6b9818c4cbd7',
  updatedAt: new Date('2020-03-21T12:37:08.730Z'),
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetFindNotificationsResultWithSingleHit = (
  ruleId = '123'
): FindHit<LegacyRuleNotificationRuleType> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [legacyGetNotificationResult({ ruleId })],
});
