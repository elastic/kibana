/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import { SavedObjectsFindResponse } from 'src/core/server';

import { ActionResult } from '../../../../../../actions/server';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  INTERNAL_RULE_ID_KEY,
  INTERNAL_IMMUTABLE_KEY,
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_STATUS_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL,
} from '../../../../../common/constants';
import { RuleAlertType, HapiReadableStream } from '../../rules/types';
import { requestMock } from './request';
import { QuerySignalsSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/query_signals_index_schema';
import { SetSignalsStatusSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/set_signal_status_schema';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getFinalizeSignalsMigrationSchemaMock } from '../../../../../common/detection_engine/schemas/request/finalize_signals_migration_schema.mock';
import { EqlSearchResponse } from '../../../../../common/detection_engine/types';
import { getSignalsMigrationStatusSchemaMock } from '../../../../../common/detection_engine/schemas/request/get_signals_migration_status_schema.mock';
import { RuleParams } from '../../schemas/rule_schemas';
import { SanitizedAlert, ResolvedSanitizedRule } from '../../../../../../alerting/common';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import {
  getPerformBulkActionSchemaMock,
  getPerformBulkActionEditSchemaMock,
} from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema.mock';
import {
  RuleExecutionEvent,
  RuleExecutionStatus,
  RuleExecutionSummary,
} from '../../../../../common/detection_engine/schemas/common';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRuleNotificationAlertType } from '../../notifications/legacy_types';
import { RuleExecutionSummariesByRuleId } from '../../rule_execution_log';

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
    path: `${DETECTION_ENGINE_RULES_URL}/_find`,
  });

export const getReadBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
    body: [getCreateRulesSchemaMock()],
  });

export const getUpdateBulkRequest = () =>
  requestMock.create({
    method: 'put',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
    body: [getCreateRulesSchemaMock()],
  });

export const getPatchBulkRequest = () =>
  requestMock.create({
    method: 'patch',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
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
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ rule_id: 'rule-1' }],
  });

export const getDeleteBulkRequestById = () =>
  requestMock.create({
    method: 'delete',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequestById = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    body: [{ id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd' }],
  });

export const getDeleteAsPostBulkRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
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
    path: DETECTION_ENGINE_PREPACKAGED_URL,
  });

export const getPrepackagedRulesStatusRequest = () =>
  requestMock.create({
    method: 'get',
    path: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
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

export const getFindResultWithSingleHit = (isRuleRegistryEnabled: boolean): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getAlertMock(isRuleRegistryEnabled, getQueryRuleParams())],
});

export const nonRuleFindResult = (isRuleRegistryEnabled: boolean): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [nonRuleAlert(isRuleRegistryEnabled)],
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

export const getRuleExecutionEventsRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL,
    params: {
      ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    },
  });

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

// TODO: Replace this with a mocks file version
export const createRuleWithActionsRequest = () => {
  const payload = getCreateRulesSchemaMock();

  return requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_RULES_URL,
    body: {
      ...payload,
      throttle: '5m',
      actions: [
        {
          group: 'default',
          id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
          params: { message: 'Rule generated {{state.signals_count}} signals' },
          action_type_id: '.slack',
        },
      ],
    },
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

export const createActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  name: '',
  config: {},
  isPreconfigured: false,
});

export const nonRuleAlert = (isRuleRegistryEnabled: boolean) => ({
  // Defaulting to QueryRuleParams because ts doesn't like empty objects
  ...getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bc',
  name: 'Non-Rule Alert',
  alertTypeId: 'something',
});

export const getAlertMock = <T extends RuleParams>(
  isRuleRegistryEnabled: boolean,
  params: T
): SanitizedAlert<T> => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`],
  alertTypeId: isRuleRegistryEnabled ? ruleTypeMappings[params.type] : 'siem.signals',
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
});

export const resolveAlertMock = <T extends RuleParams>(
  isRuleRegistryEnabled: boolean,
  params: T
): ResolvedSanitizedRule<T> => ({
  outcome: 'exactMatch',
  ...getAlertMock(isRuleRegistryEnabled, params),
});

export const updateActionResult = (): ActionResult => ({
  id: 'result-1',
  actionTypeId: 'action-id-1',
  name: '',
  config: {},
  isPreconfigured: false,
});

export const getMockPrivilegesResult = () => ({
  username: 'test-space',
  has_all_requested: false,
  cluster: {
    monitor_ml: true,
    manage_ccr: false,
    manage_index_templates: true,
    monitor_watcher: true,
    monitor_transform: true,
    read_ilm: true,
    manage_api_key: false,
    manage_security: false,
    manage_own_api_key: false,
    manage_saml: false,
    all: false,
    manage_ilm: true,
    manage_ingest_pipelines: true,
    read_ccr: false,
    manage_rollup: true,
    monitor: true,
    manage_watcher: true,
    manage: true,
    manage_transform: true,
    manage_token: false,
    manage_ml: true,
    manage_pipeline: true,
    monitor_rollup: true,
    transport_client: true,
    create_snapshot: true,
  },
  index: {
    '.siem-signals-test-space': {
      all: false,
      manage_ilm: true,
      read: false,
      create_index: true,
      read_cross_cluster: false,
      index: false,
      monitor: true,
      delete: false,
      manage: true,
      delete_index: true,
      create_doc: false,
      view_index_metadata: true,
      create: false,
      manage_follow_index: true,
      manage_leader_index: true,
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

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
export const getRuleExecutionSummarySucceeded = (): RuleExecutionSummary => ({
  last_execution: {
    date: '2020-02-18T15:26:49.783Z',
    status: RuleExecutionStatus.succeeded,
    status_order: 0,
    message: 'succeeded',
    metrics: {
      total_search_duration_ms: 200,
      total_indexing_duration_ms: 800,
      execution_gap_duration_s: 500,
    },
  },
});

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
export const getRuleExecutionSummaryFailed = (): RuleExecutionSummary => ({
  last_execution: {
    date: '2020-02-18T15:15:58.806Z',
    status: RuleExecutionStatus.failed,
    status_order: 30,
    message:
      'Signal rule name: "Query with a rule id Number 1", id: "1ea5a820-4da1-4e82-92a1-2b43a7bece08", rule_id: "query-rule-id-1" has a time gap of 5 days (412682928ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.',
    metrics: {
      total_search_duration_ms: 200,
      total_indexing_duration_ms: 800,
      execution_gap_duration_s: 500,
    },
  },
});

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
export const getRuleExecutionSummaries = (): RuleExecutionSummariesByRuleId => ({
  '04128c15-0d1b-4716-a4c5-46997ac7f3bd': getRuleExecutionSummarySucceeded(),
  '1ea5a820-4da1-4e82-92a1-2b43a7bece08': getRuleExecutionSummaryFailed(),
});

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
export const getLastFailures = (): RuleExecutionEvent[] => [
  {
    date: '2021-12-28T10:30:00.806Z',
    status: RuleExecutionStatus.failed,
    message: 'Rule failed',
  },
  {
    date: '2021-12-28T10:25:00.806Z',
    status: RuleExecutionStatus.failed,
    message: 'Rule failed',
  },
  {
    date: '2021-12-28T10:20:00.806Z',
    status: RuleExecutionStatus.failed,
    message: 'Rule failed',
  },
  {
    date: '2021-12-28T10:15:00.806Z',
    status: RuleExecutionStatus.failed,
    message: 'Rule failed',
  },
  {
    date: '2021-12-28T10:10:00.806Z',
    status: RuleExecutionStatus.failed,
    message: 'Rule failed',
  },
];

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

export const getEmptyEqlSearchResponse = (): EqlSearchResponse<unknown> => ({
  hits: { total: { value: 0, relation: 'eq' }, events: [] },
  is_partial: false,
  is_running: false,
  took: 1,
  timed_out: false,
});

export const getEmptyEqlSequencesResponse = (): EqlSearchResponse<unknown> => ({
  hits: { total: { value: 0, relation: 'eq' }, sequences: [] },
  is_partial: false,
  is_running: false,
  took: 1,
  timed_out: false,
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

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetNotificationResult = (): LegacyRuleNotificationAlertType => ({
  id: '200dbf2f-b269-4bf9-aa85-11ba32ba73ba',
  name: 'Notification for Rule Test',
  tags: ['__internal_rule_alert_id:85b64e8a-2e40-4096-86af-5ac172c10825'],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: '85b64e8a-2e40-4096-86af-5ac172c10825',
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
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetFindNotificationsResultWithSingleHit =
  (): FindHit<LegacyRuleNotificationAlertType> => ({
    page: 1,
    perPage: 1,
    total: 1,
    data: [legacyGetNotificationResult()],
  });
