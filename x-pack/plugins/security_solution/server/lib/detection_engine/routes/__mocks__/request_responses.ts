/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsFindResponse, SavedObjectsFindResult } from '@kbn/core/server';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

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

import {
  PREBUILT_RULES_STATUS_URL,
  PREBUILT_RULES_URL,
} from '../../../../../common/detection_engine/prebuilt_rules';

import type { RuleAlertType, RuleParams } from '../../rule_schema';
import { requestMock } from './request';
import type { QuerySignalsSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/query_signals_index_schema';
import type { SetSignalsStatusSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/set_signal_status_schema';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getFinalizeSignalsMigrationSchemaMock } from '../../../../../common/detection_engine/schemas/request/finalize_signals_migration_schema.mock';
import { getSignalsMigrationStatusSchemaMock } from '../../../../../common/detection_engine/schemas/request/get_signals_migration_status_schema.mock';
import type { SanitizedRule, ResolvedSanitizedRule } from '@kbn/alerting-plugin/common';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import {
  getPerformBulkActionSchemaMock,
  getPerformBulkActionEditSchemaMock,
} from '../../../../../common/detection_engine/rule_management/mocks';
import type { HapiReadableStream } from '../../rule_management/logic/import/hapi_readable_stream';
// eslint-disable-next-line no-restricted-imports
import type {
  LegacyRuleNotificationAlertType,
  LegacyIRuleActionsAttributes,
} from '../../rule_actions_legacy';

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

export const getRuleMock = <T extends RuleParams>(params: T): SanitizedRule<T> => ({
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

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetNotificationResult = ({
  id = '456',
  ruleId = '123',
}: {
  id?: string;
  ruleId?: string;
} = {}): LegacyRuleNotificationAlertType => ({
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
  tags: [],
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
  tags: [],
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
  tags: [],
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
  data: [legacyGetNotificationResult({ ruleId })],
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
