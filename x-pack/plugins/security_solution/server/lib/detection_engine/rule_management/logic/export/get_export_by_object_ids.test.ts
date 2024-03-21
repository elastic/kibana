/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { getExceptionListClientMock } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client.mock';
import { savedObjectsExporterMock } from '@kbn/core-saved-objects-import-export-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import {
  getFindResultWithMultiHits,
  getRuleMock,
} from '../../../routes/__mocks__/request_responses';
import { getThreatMock } from '../../../../../../common/detection_engine/schemas/types/threat.mock';
import { internalRuleToAPIResponse } from '../../normalization/rule_converters';
import { getEqlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';
import { getExportByObjectIds } from './get_export_by_object_ids';

const exceptionsClient = getExceptionListClientMock();
const connectors = [
  {
    id: 'non-preconfigured-connector',
    actionTypeId: '.slack',
    name: 'slack',
    config: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    referencedByCount: 1,
  },
  {
    id: 'preconfigured-connector',
    actionTypeId: '.email',
    name: 'Email (preconfigured)',
    config: {},
    isPreconfigured: true,
    isDeprecated: false,
    isSystemAction: false,
    referencedByCount: 1,
  },
];

describe('getExportByObjectIds', () => {
  const exporterMock = savedObjectsExporterMock.create();
  const requestMock = mockRouter.createKibanaRequest();
  const actionsClient = actionsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    actionsClient.getAll.mockResolvedValue(connectors);
  });

  test('it exports rules into an expected format', async () => {
    const rulesClient = rulesClientMock.create();
    const rule1 = getRuleMock(getQueryRuleParams({ ruleId: 'rule-1' }));
    const rule2 = getRuleMock(getEqlRuleParams({ ruleId: 'rule-2' }));

    rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: [rule1, rule2],
      })
    );

    const ruleIds = ['rule-1', 'rule-2'];
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      exporterMock,
      requestMock,
      actionsClient
    );

    const [rule1Json, rule2Json, emptyString] = exports.rulesNdjson.split('\n');

    // ndjson ends with a new line symbol
    expect(emptyString).toBe('');
    expect(JSON.parse(rule1Json)).toEqual(internalRuleToAPIResponse(rule1));
    expect(JSON.parse(rule2Json)).toEqual(internalRuleToAPIResponse(rule2));
    expect(JSON.parse(exports.exportDetails)).toEqual(expect.any(Object));
    expect(exports.exceptionLists).toBe('');
    expect(exports.actionConnectors).toBe('');
  });

  test('it DOES NOT export immutable rules', async () => {
    const rulesClient = rulesClientMock.create();
    const immutableRule = getRuleMock(getQueryRuleParams({ ruleId: 'rule-1', immutable: true }));

    rulesClient.get.mockResolvedValue(immutableRule);
    rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [immutableRule] }));

    const ruleIds = ['rule-1'];
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      exporterMock,
      requestMock,
      actionsClient
    );

    expect(JSON.parse(exports.exportDetails)).toMatchObject({
      exported_count: 0,
      exported_rules_count: 0,
      missing_rules: [{ rule_id: 'rule-1' }],
      missing_rules_count: 1,
    });
    expect(exports).toMatchObject({
      rulesNdjson: '',
      exceptionLists: '',
      actionConnectors: '',
    });
  });

  test('it exports a rule with action connectors', async () => {
    const rulesClient = rulesClientMock.create();
    const ruleWithActions = getRuleMock(
      getQueryRuleParams({
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        threat: getThreatMock(),
        meta: { someMeta: 'someField' },
        timelineId: 'some-timeline-id',
        timelineTitle: 'some-timeline-title',
      }),
      {
        actions: [
          {
            group: 'default',
            id: 'non-preconfigured-connector',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionTypeId: '.slack',
          },
        ],
      }
    );

    rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: [ruleWithActions],
      })
    );

    const actionConnector = {
      id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
      type: 'action',
      updated_at: '2023-01-11T11:30:31.683Z',
      created_at: '2023-01-11T11:30:31.683Z',
      version: 'WzE2MDYsMV0=',
      attributes: {
        actionTypeId: '.slack',
        name: 'slack',
        isMissingSecrets: true,
        config: {},
        secrets: {},
      },
      references: [],
      migrationVersion: { action: '8.3.0' },
      coreMigrationVersion: '8.7.0',
    };

    const actionsConnectorsStreamMock = new Readable({
      objectMode: true,
    });
    actionsConnectorsStreamMock.push(actionConnector);
    actionsConnectorsStreamMock.push({
      exportedCount: 1,
      missingRefCount: 0,
      missingReferences: [],
      excludedObjectsCount: 0,
      excludedObjects: [],
    });
    actionsConnectorsStreamMock.push(null);

    const ruleIds = ['rule-1'];
    const actionsExporterMock = {
      exportByObjects: jest.fn().mockReturnValueOnce(actionsConnectorsStreamMock),
      exportByTypes: jest.fn(),
    };
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      actionsExporterMock,
      requestMock,
      actionsClient
    );

    expect(JSON.parse(exports.rulesNdjson)).toEqual(internalRuleToAPIResponse(ruleWithActions));
    expect(JSON.parse(exports.exportDetails)).toMatchObject({
      exported_count: 2,
      exported_rules_count: 1,
      exported_action_connector_count: 1,
      missing_action_connection_count: 0,
      missing_action_connections: [],
    });
    expect(JSON.parse(exports.actionConnectors)).toEqual(actionConnector);
  });

  test('it DOES NOT export preconfigured action connectors', async () => {
    const rulesClient = rulesClientMock.create();
    const ruleWithActions = getRuleMock(
      getQueryRuleParams({
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        threat: getThreatMock(),
        meta: { someMeta: 'someField' },
        timelineId: 'some-timeline-id',
        timelineTitle: 'some-timeline-title',
      }),
      {
        actions: [
          {
            group: 'default',
            id: 'preconfigured-connector',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionTypeId: '.email',
          },
        ],
      }
    );

    rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({
        data: [ruleWithActions],
      })
    );

    const readable = new Readable({
      objectMode: true,
      read() {
        return null;
      },
    });

    const ruleIds = ['rule-1'];
    const exporterMockWithConnector = {
      exportByObjects: jest.fn().mockReturnValueOnce(readable),
      exportByTypes: jest.fn(),
    };
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      exporterMockWithConnector,
      requestMock,
      actionsClient
    );

    expect(JSON.parse(exports.rulesNdjson)).toMatchObject({
      actions: [
        {
          group: 'default',
          id: 'preconfigured-connector',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          action_type_id: '.email',
          frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
        },
      ],
    });
    expect(JSON.parse(exports.exportDetails)).toMatchObject({
      exported_count: 1,
      exported_rules_count: 1,
      exported_action_connector_count: 0,
      missing_action_connection_count: 0,
      missing_action_connections: [],
    });
    expect(exports.actionConnectors).toBe('');
  });

  test('it processes large exports in chunks to avoid "too_many_clauses" error', async () => {
    const EXPECTED_CHUNK_SIZE = 1024;
    // Let's have 3 chunks, two chunks by 1024 rules and the third chunk containing just one rule
    const RULES_COUNT = 2 * EXPECTED_CHUNK_SIZE + 1;
    const rules = new Array(RULES_COUNT)
      .fill(0)
      .map((_, i) => getRuleMock(getQueryRuleParams({ ruleId: `rule-${i}` })));

    const rulesClient = rulesClientMock.create();
    const chunk1 = getFindResultWithMultiHits({
      data: rules.slice(0, EXPECTED_CHUNK_SIZE),
    });
    const chunk2 = getFindResultWithMultiHits({
      data: rules.slice(EXPECTED_CHUNK_SIZE, 2 * EXPECTED_CHUNK_SIZE),
    });
    const chunk3 = getFindResultWithMultiHits({
      data: rules.slice(2 * EXPECTED_CHUNK_SIZE),
    });

    rulesClient.find
      .mockResolvedValueOnce(chunk1)
      .mockResolvedValueOnce(chunk2)
      .mockResolvedValueOnce(chunk3);

    const ruleIds = rules.map((rule) => rule.params.ruleId);
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      exporterMock,
      requestMock,
      actionsClient
    );

    expect(rulesClient.find).toHaveBeenCalledTimes(3);
    expect(rulesClient.find).toHaveBeenCalledWith({
      options: expect.objectContaining({ perPage: EXPECTED_CHUNK_SIZE }),
    });

    expect(JSON.parse(exports.exportDetails)).toMatchObject({
      exported_count: RULES_COUNT,
      exported_rules_count: RULES_COUNT,
      missing_rules: [],
      missing_rules_count: 0,
    });
  });

  test('it DOES NOT fail when a rule is not found (rulesClient returns 404)', async () => {
    const rulesClient = rulesClientMock.create();

    rulesClient.get.mockRejectedValue({ output: { statusCode: 404 } });
    rulesClient.find.mockResolvedValue(getFindResultWithMultiHits({ data: [] }));

    const ruleIds = ['rule-1'];
    const exports = await getExportByObjectIds(
      rulesClient,
      exceptionsClient,
      ruleIds,
      exporterMock,
      requestMock,
      actionsClient
    );

    expect(JSON.parse(exports.exportDetails)).toMatchObject({
      exported_count: 0,
      exported_rules_count: 0,
      missing_rules: [{ rule_id: 'rule-1' }],
      missing_rules_count: 1,
    });
    expect(exports).toMatchObject({
      rulesNdjson: '',
      exceptionLists: '',
      actionConnectors: '',
    });
  });
});
