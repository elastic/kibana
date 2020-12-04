/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import {
  SignalSourceHit,
  SignalSearchResponse,
  BulkResponse,
  BulkItem,
  RuleAlertAttributes,
  SignalHit,
} from '../types';
import {
  Logger,
  SavedObject,
  SavedObjectsFindResponse,
} from '../../../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../../../src/core/server/mocks';
import { RuleTypeParams } from '../../types';
import { IRuleStatusSOAttributes } from '../../rules/types';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response';

export const sampleRuleAlertParams = (
  maxSignals?: number | undefined,
  riskScore?: number | undefined
): RuleTypeParams => ({
  author: ['Elastic'],
  buildingBlockType: 'default',
  ruleId: 'rule-1',
  description: 'Detecting root and admin users',
  eventCategoryOverride: undefined,
  falsePositives: [],
  immutable: false,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  type: 'query',
  from: 'now-6m',
  to: 'now',
  severity: 'high',
  severityMapping: [],
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  license: 'Elastic License',
  outputIndex: '.siem-signals',
  references: ['http://google.com'],
  riskScore: riskScore ? riskScore : 50,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  maxSignals: maxSignals ? maxSignals : 10000,
  note: '',
  anomalyThreshold: undefined,
  machineLearningJobId: undefined,
  filters: undefined,
  savedId: undefined,
  threshold: undefined,
  threatFilters: undefined,
  threatQuery: undefined,
  threatMapping: undefined,
  threatIndex: undefined,
  threatLanguage: undefined,
  timelineId: undefined,
  timelineTitle: undefined,
  timestampOverride: undefined,
  meta: undefined,
  threat: undefined,
  version: 1,
  exceptionsList: getListArrayMock(),
  concurrentSearches: undefined,
  itemsPerSearch: undefined,
});

export const sampleRuleSO = (): SavedObject<RuleAlertAttributes> => {
  return {
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    type: 'alert',
    version: '1',
    updated_at: '2020-03-27T22:55:59.577Z',
    attributes: {
      actions: [],
      enabled: true,
      name: 'rule-name',
      tags: ['some fake tag 1', 'some fake tag 2'],
      createdBy: 'sample user',
      createdAt: '2020-03-27T22:55:59.577Z',
      updatedBy: 'sample user',
      schedule: {
        interval: '5m',
      },
      throttle: 'no_actions',
      params: sampleRuleAlertParams(),
    },
    references: [],
  };
};

export const expectedRule = (): RulesSchema => {
  return {
    actions: [],
    author: ['Elastic'],
    building_block_type: 'default',
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    rule_id: 'rule-1',
    false_positives: [],
    max_signals: 10000,
    risk_score: 50,
    risk_score_mapping: [],
    output_index: '.siem-signals',
    description: 'Detecting root and admin users',
    from: 'now-6m',
    immutable: false,
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    interval: '5m',
    language: 'kuery',
    license: 'Elastic License',
    name: 'rule-name',
    query: 'user.name: root or user.name: admin',
    references: ['http://google.com'],
    severity: 'high',
    severity_mapping: [],
    tags: ['some fake tag 1', 'some fake tag 2'],
    threat: [],
    type: 'query',
    to: 'now',
    note: '',
    enabled: true,
    created_by: 'sample user',
    updated_by: 'sample user',
    version: 1,
    updated_at: '2020-03-27T22:55:59.577Z',
    created_at: '2020-03-27T22:55:59.577Z',
    throttle: 'no_actions',
    exceptions_list: getListArrayMock(),
  };
};

export const sampleDocNoSortIdNoVersion = (someUuid: string = sampleIdGuid): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
  },
});

export const sampleDocWithSortId = (
  someUuid: string = sampleIdGuid,
  ip?: string | string[],
  destIp?: string | string[]
): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    source: {
      ip: ip ?? '127.0.0.1',
    },
    destination: {
      ip: destIp ?? '127.0.0.1',
    },
  },
  sort: ['1234567891111'],
});

export const sampleDocNoSortId = (
  someUuid: string = sampleIdGuid,
  ip?: string
): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    source: {
      ip: ip ?? '127.0.0.1',
    },
  },
  sort: [],
});

export const sampleDocSeverity = (severity?: unknown, fieldName?: string): SignalSourceHit => {
  const doc = {
    _index: 'myFakeSignalIndex',
    _type: 'doc',
    _score: 100,
    _version: 1,
    _id: sampleIdGuid,
    _source: {
      someKey: 'someValue',
      '@timestamp': '2020-04-20T21:27:45+0000',
    },
    sort: [],
  };

  set(doc._source, fieldName ?? 'event.severity', severity);
  return doc;
};

export const sampleDocRiskScore = (riskScore?: unknown): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _type: 'doc',
  _score: 100,
  _version: 1,
  _id: sampleIdGuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    event: {
      risk: riskScore,
    },
  },
  sort: [],
});

export const sampleEmptyDocSearchResults = (): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [],
  },
});

export const sampleDocWithAncestors = (): SignalSearchResponse => {
  const sampleDoc = sampleDocNoSortId();
  delete sampleDoc.sort;
  delete sampleDoc._source.source;
  sampleDoc._source.signal = {
    parent: {
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 0,
    },
    ancestors: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    rule: {
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    },
    depth: 1,
  };

  return {
    took: 10,
    timed_out: false,
    _shards: {
      total: 10,
      successful: 10,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 100,
      hits: [sampleDoc],
    },
  };
};

export const sampleSignalHit = (): SignalHit => ({
  '@timestamp': '2020-04-20T21:27:45+0000',
  event: {
    kind: 'signal',
  },
  signal: {
    parents: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      {
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    ancestors: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      {
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    status: 'open',
    rule: {
      author: [],
      id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
      created_at: '2020-04-20T21:27:45+0000',
      updated_at: '2020-04-20T21:27:45+0000',
      created_by: 'elastic',
      description: 'some description',
      enabled: true,
      false_positives: ['false positive 1', 'false positive 2'],
      from: 'now-6m',
      immutable: false,
      name: 'Query with a rule id',
      query: 'user.name: root or user.name: admin',
      references: ['test 1', 'test 2'],
      severity: 'high',
      severity_mapping: [],
      updated_by: 'elastic_kibana',
      tags: ['some fake tag 1', 'some fake tag 2'],
      to: 'now',
      type: 'query',
      threat: [],
      version: 1,
      status: 'succeeded',
      status_date: '2020-02-22T16:47:50.047Z',
      last_success_at: '2020-02-22T16:47:50.047Z',
      last_success_message: 'succeeded',
      output_index: '.siem-signals-default',
      max_signals: 100,
      risk_score: 55,
      risk_score_mapping: [],
      language: 'kuery',
      rule_id: 'query-rule-id',
      interval: '5m',
      exceptions_list: getListArrayMock(),
    },
    depth: 1,
  },
});

export const sampleBulkCreateDuplicateResult = {
  took: 60,
  errors: true,
  items: [
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        _version: 1,
        result: 'created',
        _shards: {
          total: 2,
          successful: 1,
          failed: 0,
        },
        _seq_no: 1,
        _primary_term: 1,
        status: 201,
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleBulkCreateErrorResult = {
  ...sampleBulkCreateDuplicateResult,
  items: [
    ...sampleBulkCreateDuplicateResult.items,
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '5',
        status: 500,
        error: {
          type: 'internal_server_error',
          reason: '[4]: internal server error',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleDocSearchResultsNoSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoVersion = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortIdNoVersion(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoHits = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const repeatedSearchResultsWithSortId = (
  total: number,
  pageSize: number,
  guids: string[],
  ips?: Array<string | string[]>,
  destIps?: Array<string | string[]>
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: Array.from({ length: pageSize }).map((x, index) => ({
      ...sampleDocWithSortId(
        guids[index],
        ips ? ips[index] : '127.0.0.1',
        destIps ? destIps[index] : '127.0.0.1'
      ),
    })),
  },
});

export const repeatedSearchResultsWithNoSortId = (
  total: number,
  pageSize: number,
  guids: string[],
  ips?: string[]
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: Array.from({ length: pageSize }).map((x, index) => ({
      ...sampleDocNoSortId(guids[index], ips ? ips[index] : '127.0.0.1'),
    })),
  },
});

export const sampleDocSearchResultsWithSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 1,
    max_score: 100,
    hits: [
      {
        ...sampleDocWithSortId(someUuid),
      },
    ],
  },
});

export const sampleRuleGuid = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';
export const sampleIdGuid = 'e1e08ddc-5e37-49ff-a258-5393aa44435a';

export const exampleRuleStatus: () => SavedObject<IRuleStatusSOAttributes> = () => ({
  type: ruleStatusSavedObjectType,
  id: '042e6d90-7069-11ea-af8b-0f8ae4fa817e',
  attributes: {
    alertId: 'f4b8e31d-cf93-4bde-a265-298bde885cd7',
    statusDate: '2020-03-27T22:55:59.517Z',
    status: 'succeeded',
    lastFailureAt: null,
    lastSuccessAt: '2020-03-27T22:55:59.517Z',
    lastFailureMessage: null,
    lastSuccessMessage: 'succeeded',
    gap: null,
    bulkCreateTimeDurations: [],
    searchAfterTimeDurations: [],
    lastLookBackDate: null,
  },
  references: [],
  updated_at: '2020-03-27T22:55:59.577Z',
  version: 'WzgyMiwxXQ==',
});

export const exampleFindRuleStatusResponse: (
  mockStatuses: Array<SavedObject<IRuleStatusSOAttributes>>
) => SavedObjectsFindResponse<IRuleStatusSOAttributes> = (
  mockStatuses = [exampleRuleStatus()]
) => ({
  total: 1,
  per_page: 6,
  page: 1,
  saved_objects: mockStatuses.map((obj) => ({ ...obj, score: 1 })),
});

export const mockLogger: Logger = loggingSystemMock.createLogger();

export const sampleBulkErrorItem = (
  {
    status,
    reason,
  }: {
    status: number;
    reason: string;
  } = { status: 400, reason: 'Invalid call' }
): BulkItem => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status,
      _shards: {
        total: 1,
        successful: 0,
        failed: 1,
      },
      error: {
        type: 'Invalid',
        reason,
        shard: 'shard 123',
        index: 'mock_index',
      },
    },
  };
};

export const sampleBulkItem = (): BulkItem => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status: 200,
      result: 'some result here',
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
      },
    },
  };
};

export const sampleEmptyBulkResponse = (): BulkResponse => ({
  took: 0,
  errors: false,
  items: [],
});

export const sampleBulkError = (): BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkErrorItem()],
});

export const sampleBulkResponse = (): BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkItem()],
});
