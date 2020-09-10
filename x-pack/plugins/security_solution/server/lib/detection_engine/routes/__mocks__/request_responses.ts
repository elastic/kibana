/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { ActionResult } from '../../../../../../actions/server';
import { SignalSearchResponse } from '../../signals/types';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  INTERNAL_RULE_ID_KEY,
  INTERNAL_IMMUTABLE_KEY,
  DETECTION_ENGINE_PREPACKAGED_URL,
} from '../../../../../common/constants';
import { ShardsResponse } from '../../../types';
import {
  RuleAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  HapiReadableStream,
} from '../../rules/types';
import { requestMock } from './request';
import { RuleNotificationAlertType } from '../../notifications/types';
import { QuerySignalsSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/query_signals_index_schema';
import { SetSignalsStatusSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/set_signal_status_schema';
import { getCreateRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/create_rules_schema.mock';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';

export const typicalSetStatusSignalByIdsPayload = (): SetSignalsStatusSchemaDecoded => ({
  signal_ids: ['somefakeid1', 'somefakeid2'],
  status: 'closed',
});

export const typicalSetStatusSignalByQueryPayload = (): SetSignalsStatusSchemaDecoded => ({
  query: { bool: { filter: { range: { '@timestamp': { gte: 'now-2M', lte: 'now/M' } } } } },
  status: 'closed',
});

export const typicalSignalsQuery = (): QuerySignalsSchemaDecoded => ({
  query: { match_all: {} },
});

export const typicalSignalsQueryAggs = (): QuerySignalsSchemaDecoded => ({
  aggs: { statuses: { terms: { field: 'signal.status', size: 10 } } },
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

export const getPrivilegeRequest = () =>
  requestMock.create({
    method: 'get',
    path: DETECTION_ENGINE_PRIVILEGES_URL,
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

export const getFindResultWithSingleHit = (): FindHit => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getResult()],
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

export const ruleStatusRequest = () =>
  requestMock.create({
    method: 'post',
    path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
    body: { ids: ['someId'] },
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

export const nonRuleAlert = () => ({
  ...getResult(),
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bc',
  name: 'Non-Rule Alert',
  alertTypeId: 'something',
});

export const getResult = (): RuleAlertType => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`],
  alertTypeId: 'siem.signals',
  consumer: 'siem',
  params: {
    author: ['Elastic'],
    buildingBlockType: undefined,
    anomalyThreshold: undefined,
    description: 'Detecting root and admin users',
    ruleId: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    falsePositives: [],
    from: 'now-6m',
    immutable: false,
    savedId: undefined,
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    license: 'Elastic License',
    machineLearningJobId: undefined,
    outputIndex: '.siem-signals',
    timelineId: 'some-timeline-id',
    timelineTitle: 'some-timeline-title',
    meta: { someMeta: 'someField' },
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    riskScore: 50,
    riskScoreMapping: [],
    ruleNameOverride: undefined,
    maxSignals: 100,
    severity: 'high',
    severityMapping: [],
    to: 'now',
    type: 'query',
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0040',
          name: 'impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
        },
        technique: [
          {
            id: 'T1499',
            name: 'endpoint denial of service',
            reference: 'https://attack.mitre.org/techniques/T1499/',
          },
        ],
      },
    ],
    threshold: undefined,
    timestampOverride: undefined,
    references: ['http://www.example.com', 'https://ww.example.com'],
    note: '# Investigative notes',
    version: 1,
    exceptionsList: getListArrayMock(),
  },
  createdAt: new Date('2019-12-13T16:40:33.400Z'),
  updatedAt: new Date('2019-12-13T16:40:33.400Z'),
  schedule: { interval: '5m' },
  enabled: true,
  actions: [],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKey: null,
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '2dabe330-0702-11ea-8b50-773b89126888',
});

export const getMlResult = (): RuleAlertType => {
  const result = getResult();

  return {
    ...result,
    params: {
      ...result.params,
      query: undefined,
      language: undefined,
      filters: undefined,
      index: undefined,
      type: 'machine_learning',
      anomalyThreshold: 44,
      machineLearningJobId: 'some_job_id',
    },
  };
};

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

export const getFindResultStatusEmpty = (): SavedObjectsFindResponse<
  IRuleSavedAttributesSavedObjectAttributes
> => ({
  page: 1,
  per_page: 1,
  total: 0,
  saved_objects: [],
});

export const getFindResultStatus = (): SavedObjectsFindResponse<
  IRuleSavedAttributesSavedObjectAttributes
> => ({
  page: 1,
  per_page: 6,
  total: 2,
  saved_objects: [
    {
      type: 'my-type',
      id: 'e0b86950-4e9f-11ea-bdbd-07b56aa159b3',
      attributes: {
        alertId: '1ea5a820-4da1-4e82-92a1-2b43a7bece08',
        statusDate: '2020-02-18T15:26:49.783Z',
        status: 'succeeded',
        lastFailureAt: undefined,
        lastSuccessAt: '2020-02-18T15:26:49.783Z',
        lastFailureMessage: undefined,
        lastSuccessMessage: 'succeeded',
        lastLookBackDate: new Date('2020-02-18T15:14:58.806Z').toISOString(),
        gap: '500.32',
        searchAfterTimeDurations: ['200.00'],
        bulkCreateTimeDurations: ['800.43'],
      },
      score: 1,
      references: [],
      updated_at: '2020-02-18T15:26:51.333Z',
      version: 'WzQ2LDFd',
    },
    {
      type: 'my-type',
      id: '91246bd0-5261-11ea-9650-33b954270f67',
      attributes: {
        alertId: '1ea5a820-4da1-4e82-92a1-2b43a7bece08',
        statusDate: '2020-02-18T15:15:58.806Z',
        status: 'failed',
        lastFailureAt: '2020-02-18T15:15:58.806Z',
        lastSuccessAt: '2020-02-13T20:31:59.855Z',
        lastFailureMessage:
          'Signal rule name: "Query with a rule id Number 1", id: "1ea5a820-4da1-4e82-92a1-2b43a7bece08", rule_id: "query-rule-id-1" has a time gap of 5 days (412682928ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.',
        lastSuccessMessage: 'succeeded',
        lastLookBackDate: new Date('2020-02-18T15:14:58.806Z').toISOString(),
        gap: '500.32',
        searchAfterTimeDurations: ['200.00'],
        bulkCreateTimeDurations: ['800.43'],
      },
      score: 1,
      references: [],
      updated_at: '2020-02-18T15:15:58.860Z',
      version: 'WzMyLDFd',
    },
  ],
});

export const getEmptySignalsResponse = (): SignalSearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
  aggregations: {
    alertsByGrouping: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
  },
});

export const getSuccessfulSignalUpdateResponse = () => ({
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

export const getIndexName = () => 'index-name';
export const getEmptyIndex = (): { _shards: Partial<ShardsResponse> } => ({
  _shards: { total: 0 },
});
export const getNonEmptyIndex = (): { _shards: Partial<ShardsResponse> } => ({
  _shards: { total: 1 },
});

export const getNotificationResult = (): RuleNotificationAlertType => ({
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
  apiKey: null,
  apiKeyOwner: 'elastic',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: new Date('2020-03-21T11:15:13.530Z'),
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '62b3a130-6b70-11ea-9ce9-6b9818c4cbd7',
  updatedAt: new Date('2020-03-21T12:37:08.730Z'),
});

export const getFindNotificationsResultWithSingleHit = (): FindHit<RuleNotificationAlertType> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getNotificationResult()],
});
