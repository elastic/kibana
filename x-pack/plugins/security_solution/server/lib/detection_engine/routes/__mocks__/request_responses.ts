/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import { SavedObjectsFindResponse, SavedObjectsFindResult } from 'src/core/server';

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
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
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
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributes } from '../../rule_actions/legacy_types';
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
    query: {
      start: 'now-30',
      end: 'now',
      query_text: '',
      status_filters: '',
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

export const getAggregateExecutionEvents = (): GetAggregateRuleExecutionEventsResponse => ({
  events: [
    {
      execution_uuid: '34bab6e0-89b6-4d10-9cbb-cda76d362db6',
      timestamp: '2022-03-11T22:04:05.931Z',
      duration_ms: 1975,
      status: 'success',
      message:
        "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
      num_active_alerts: 0,
      num_new_alerts: 0,
      num_recovered_alerts: 0,
      num_triggered_actions: 0,
      num_succeeded_actions: 0,
      num_errored_actions: 0,
      total_search_duration_ms: 0,
      es_search_duration_ms: 538,
      schedule_delay_ms: 2091,
      timed_out: false,
      indexing_duration_ms: 7,
      search_duration_ms: 551,
      gap_duration_ms: 0,
      security_status: 'succeeded',
      security_message: 'succeeded',
    },
    {
      execution_uuid: '254d8400-9dc7-43c5-ad4b-227273d1a44b',
      timestamp: '2022-03-11T22:02:41.923Z',
      duration_ms: 11916,
      status: 'success',
      message:
        "rule executed: siem.queryRule:f78f3550-a186-11ec-89a1-0bce95157aba: 'This Rule Makes Alerts, Actions, AND Moar!'",
      num_active_alerts: 0,
      num_new_alerts: 0,
      num_recovered_alerts: 0,
      num_triggered_actions: 1,
      num_succeeded_actions: 1,
      num_errored_actions: 0,
      total_search_duration_ms: 0,
      es_search_duration_ms: 1406,
      schedule_delay_ms: 1583,
      timed_out: false,
      indexing_duration_ms: 0,
      search_duration_ms: 0,
      gap_duration_ms: 0,
      security_status: 'partial failure',
      security_message:
        'Check privileges failed to execute ResponseError: index_not_found_exception: [index_not_found_exception] Reason: no such index [broken-index] name: "This Rule Makes Alerts, Actions, AND Moar!" id: "f78f3550-a186-11ec-89a1-0bce95157aba" rule id: "b64b4540-d035-4826-a1e7-f505bf4b9653" execution id: "254d8400-9dc7-43c5-ad4b-227273d1a44b" space ID: "default"',
    },
  ],
  total: 2,
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
export const legacyGetNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [`__internal_rule_alert_id:${ruleId}`],
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
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetHourlyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [`__internal_rule_alert_id:${ruleId}`],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '1h',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
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
export const legacyGetDailyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [`__internal_rule_alert_id:${ruleId}`],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '1d',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
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
export const legacyGetWeeklyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [`__internal_rule_alert_id:${ruleId}`],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '7d',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
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
export const legacyGetFindNotificationsResultWithSingleHit = (
  ruleId = '123'
): FindHit<LegacyRuleNotificationAlertType> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [legacyGetNotificationResult(ruleId)],
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleNoActionsSOResult = (
  ruleId = '123'
): SavedObjectsFindResult<LegacyIRuleActionsAttributes> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_NO_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [],
    ruleThrottle: 'no_actions',
    alertThrottle: null,
  },
  references: [{ id: ruleId, type: 'alert', name: 'alert_0' }],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleEveryRunSOResult = (
  ruleId = '123'
): SavedObjectsFindResult<LegacyIRuleActionsAttributes> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_RULE_RUN_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: 'rule',
    alertThrottle: null,
  },
  references: [{ id: ruleId, type: 'alert', name: 'alert_0' }],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleHourlyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<LegacyIRuleActionsAttributes> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_HOURLY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '1h',
    alertThrottle: '1h',
  },
  references: [
    { id: ruleId, type: 'alert', name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleDailyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<LegacyIRuleActionsAttributes> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_DAILY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '1d',
    alertThrottle: '1d',
  },
  references: [
    { id: ruleId, type: 'alert', name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleWeeklyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<LegacyIRuleActionsAttributes> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_WEEKLY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '7d',
    alertThrottle: '7d',
  },
  references: [
    { id: ruleId, type: 'alert', name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

const getLegacyActionSOs = (ruleId = '123', connectorId = '456') => ({
  none: () => legacyGetSiemNotificationRuleNoActionsSOResult(ruleId),
  rule: () => legacyGetSiemNotificationRuleEveryRunSOResult(ruleId),
  hourly: () => legacyGetSiemNotificationRuleHourlyActionsSOResult(ruleId, connectorId),
  daily: () => legacyGetSiemNotificationRuleDailyActionsSOResult(ruleId, connectorId),
  weekly: () => legacyGetSiemNotificationRuleWeeklyActionsSOResult(ruleId, connectorId),
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleActionsSOResultWithSingleHit = (
  actionTypes: Array<'none' | 'rule' | 'daily' | 'hourly' | 'weekly'>,
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResponse<LegacyIRuleActionsAttributes> => {
  const actions = getLegacyActionSOs(ruleId, connectorId);

  return {
    page: 1,
    per_page: 1,
    total: 1,
    saved_objects: actionTypes.map((type) => actions[type]()),
  };
};
