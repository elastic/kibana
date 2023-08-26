/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';
import type { RulesErrors } from './get_export_by_object_ids';
import { getExportByObjectIds, getRulesFromObjects } from './get_export_by_object_ids';
import type { FindHit } from '../../../routes/__mocks__/request_responses';
import {
  getRuleMock,
  getFindResultWithSingleHit,
  getEmptySavedObjectsResponse,
} from '../../../routes/__mocks__/request_responses';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import { getThreatMock } from '../../../../../../common/detection_engine/schemas/types/threat.mock';
import {
  getSampleDetailsAsNdjson,
  getOutputDetailsSampleWithExceptions,
} from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { getExceptionListClientMock } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client.mock';
import { savedObjectsExporterMock } from '@kbn/core-saved-objects-import-export-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

const exceptionsClient = getExceptionListClientMock();
import type { loggingSystemMock } from '@kbn/core/server/mocks';
import { requestContextMock } from '../../../routes/__mocks__/request_context';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';

const connectors = [
  {
    id: '123',
    actionTypeId: '.slack',
    name: 'slack',
    config: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    referencedByCount: 1,
  },
  {
    id: '456',
    actionTypeId: '.email',
    name: 'Email (preconfigured)',
    config: {},
    isPreconfigured: true,
    isDeprecated: false,
    isSystemAction: false,
    referencedByCount: 1,
  },
];
describe('get_export_by_object_ids', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const { clients } = requestContextMock.createTools();
  const exporterMock = savedObjectsExporterMock.create();
  const requestMock = mockRouter.createKibanaRequest();
  const actionsClient = actionsClientMock.create();
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    clients.savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectsResponse());
    actionsClient.getAll.mockImplementation(async () => {
      return connectors;
    });
  });

  describe('getExportByObjectIds', () => {
    test('it exports object ids into an expected string with new line characters', async () => {
      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(
        rulesClient,
        exceptionsClient,
        clients.savedObjectsClient,
        objects,
        logger,
        exporterMock,
        requestMock,
        actionsClient
      );
      const exportsObj = {
        rulesNdjson: JSON.parse(exports.rulesNdjson),
        exportDetails: JSON.parse(exports.exportDetails),
      };
      expect(exportsObj).toEqual({
        rulesNdjson: {
          author: ['Elastic'],
          actions: [],
          building_block_type: 'default',
          created_at: '2019-12-13T16:40:33.400Z',
          updated_at: '2019-12-13T16:40:33.400Z',
          created_by: 'elastic',
          description: 'Detecting root and admin users',
          enabled: true,
          false_positives: [],
          filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
          from: 'now-6m',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          rule_id: 'rule-1',
          language: 'kuery',
          license: 'Elastic License',
          output_index: '.siem-signals',
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          name: 'Detect Root/Admin Users',
          query: 'user.name: root or user.name: admin',
          references: ['http://example.com', 'https://example.com'],
          related_integrations: [],
          required_fields: [],
          revision: 0,
          setup: '',
          timeline_id: 'some-timeline-id',
          timeline_title: 'some-timeline-title',
          meta: { someMeta: 'someField' },
          severity: 'high',
          severity_mapping: [],
          updated_by: 'elastic',
          tags: [],
          to: 'now',
          type: 'query',
          threat: getThreatMock(),
          note: '# Investigative notes',
          version: 1,
          exceptions_list: getListArrayMock(),
          investigation_fields: [],
        },
        exportDetails: {
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
          missing_exception_list_item_count: 0,
          missing_exception_list_items: [],
          missing_exception_lists: [],
          missing_exception_lists_count: 0,
          missing_rules: [],
          missing_rules_count: 0,
          excluded_action_connection_count: 0,
          excluded_action_connections: [],
          exported_action_connector_count: 0,
          missing_action_connection_count: 0,
          missing_action_connections: [],
        },
      });
    });

    test('it does not export immutable rules', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getRuleMock(getQueryRuleParams());
      result.params.immutable = true;

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [result],
      };

      rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams()));
      rulesClient.find.mockResolvedValue(findResult);

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(
        rulesClient,
        exceptionsClient,
        clients.savedObjectsClient,
        objects,
        logger,
        exporterMock,
        requestMock,
        actionsClient
      );
      const details = getOutputDetailsSampleWithExceptions({
        missingRules: [{ rule_id: 'rule-1' }],
        missingCount: 1,
      });
      expect(exports).toEqual({
        rulesNdjson: '',
        exportDetails: getSampleDetailsAsNdjson(details),
        exceptionLists: '',
        actionConnectors: '',
      });
    });

    test('it will export with rule and action connectors', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getFindResultWithSingleHit();
      const alert = {
        ...getRuleMock(getQueryRuleParams()),
        actions: [
          {
            group: 'default',
            id: '123',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionTypeId: '.slack',
          },
        ],
      };

      alert.params = {
        ...alert.params,
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        threat: getThreatMock(),
        meta: { someMeta: 'someField' },
        timelineId: 'some-timeline-id',
        timelineTitle: 'some-timeline-title',
      };
      result.data = [alert];
      rulesClient.find.mockResolvedValue(result);
      let eventCount = 0;
      const readable = new Readable({
        objectMode: true,
        read() {
          if (eventCount === 0) {
            eventCount += 1;
            return this.push({
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
            });
          }
          if (eventCount === 1) {
            eventCount += 1;
            return this.push({
              exportedCount: 1,
              missingRefCount: 0,
              missingReferences: [],
              excludedObjectsCount: 0,
              excludedObjects: [],
            });
          }
          return this.push(null);
        },
      });
      const objects = [{ rule_id: 'rule-1' }];
      const exporterMockWithConnector = {
        exportByObjects: () => jest.fn().mockReturnValueOnce(readable),

        exportByTypes: jest.fn(),
      };
      const exports = await getExportByObjectIds(
        rulesClient,
        exceptionsClient,
        clients.savedObjectsClient,
        objects,
        logger,
        exporterMockWithConnector as never,
        requestMock,
        actionsClient
      );
      const rulesJson = JSON.parse(exports.rulesNdjson);
      const detailsJson = JSON.parse(exports.exportDetails);
      const actionConnectorsJSON = JSON.parse(exports.actionConnectors);
      expect(rulesJson).toEqual({
        author: ['Elastic'],
        actions: [
          {
            group: 'default',
            id: '123',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            action_type_id: '.slack',
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
        ],
        building_block_type: 'default',
        created_at: '2019-12-13T16:40:33.400Z',
        updated_at: '2019-12-13T16:40:33.400Z',
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        rule_id: 'rule-1',
        language: 'kuery',
        license: 'Elastic License',
        output_index: '.siem-signals',
        max_signals: 10000,
        risk_score: 50,
        risk_score_mapping: [],
        name: 'Detect Root/Admin Users',
        query: 'user.name: root or user.name: admin',
        references: ['http://example.com', 'https://example.com'],
        related_integrations: [],
        required_fields: [],
        setup: '',
        timeline_id: 'some-timeline-id',
        timeline_title: 'some-timeline-title',
        meta: { someMeta: 'someField' },
        severity: 'high',
        severity_mapping: [],
        updated_by: 'elastic',
        tags: [],
        to: 'now',
        type: 'query',
        threat: getThreatMock(),
        note: '# Investigative notes',
        version: 1,
        revision: 0,
        exceptions_list: getListArrayMock(),
        investigation_fields: [],
      });
      expect(detailsJson).toEqual({
        exported_exception_list_count: 0,
        exported_exception_list_item_count: 0,
        exported_count: 2,
        exported_rules_count: 1,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
        missing_rules: [],
        missing_rules_count: 0,
        excluded_action_connection_count: 0,
        excluded_action_connections: [],
        exported_action_connector_count: 1,
        missing_action_connection_count: 0,
        missing_action_connections: [],
      });
      expect(actionConnectorsJSON).toEqual({
        attributes: {
          actionTypeId: '.slack',
          config: {},
          isMissingSecrets: true,
          name: 'slack',
          secrets: {},
        },
        coreMigrationVersion: '8.7.0',
        created_at: '2023-01-11T11:30:31.683Z',
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        migrationVersion: {
          action: '8.3.0',
        },
        references: [],
        type: 'action',
        updated_at: '2023-01-11T11:30:31.683Z',
        version: 'WzE2MDYsMV0=',
      });
    });
    test('it will export rule without its action connectors as they are Preconfigured', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getFindResultWithSingleHit();
      const alert = {
        ...getRuleMock(getQueryRuleParams()),
        actions: [
          {
            group: 'default',
            id: '456',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionTypeId: '.email',
          },
        ],
      };

      alert.params = {
        ...alert.params,
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        threat: getThreatMock(),
        meta: { someMeta: 'someField' },
        timelineId: 'some-timeline-id',
        timelineTitle: 'some-timeline-title',
      };
      result.data = [alert];
      rulesClient.find.mockResolvedValue(result);
      const readable = new Readable({
        objectMode: true,
        read() {
          return null;
        },
      });
      const objects = [{ rule_id: 'rule-1' }];
      const exporterMockWithConnector = {
        exportByObjects: () => jest.fn().mockReturnValueOnce(readable),

        exportByTypes: jest.fn(),
      };
      const exports = await getExportByObjectIds(
        rulesClient,
        exceptionsClient,
        clients.savedObjectsClient,
        objects,
        logger,
        exporterMockWithConnector as never,
        requestMock,
        actionsClient
      );
      const rulesJson = JSON.parse(exports.rulesNdjson);
      const detailsJson = JSON.parse(exports.exportDetails);
      expect(rulesJson).toEqual(
        expect.objectContaining({
          actions: [
            {
              group: 'default',
              id: '456',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              action_type_id: '.email',
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        })
      );
      expect(detailsJson).toEqual({
        exported_exception_list_count: 0,
        exported_exception_list_item_count: 0,
        exported_count: 1,
        exported_rules_count: 1,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
        missing_rules: [],
        missing_rules_count: 0,
        excluded_action_connection_count: 0,
        excluded_action_connections: [],
        exported_action_connector_count: 0,
        missing_action_connection_count: 0,
        missing_action_connections: [],
      });
    });
  });

  describe('getRulesFromObjects', () => {
    test('it returns transformed rules from objects sent in', async () => {
      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(
        rulesClient,
        clients.savedObjectsClient,
        objects,
        logger
      );
      const expected: RulesErrors = {
        exportedCount: 1,
        missingRules: [],
        rules: [
          {
            actions: [],
            author: ['Elastic'],
            building_block_type: 'default',
            created_at: '2019-12-13T16:40:33.400Z',
            updated_at: '2019-12-13T16:40:33.400Z',
            created_by: 'elastic',
            description: 'Detecting root and admin users',
            enabled: true,
            false_positives: [],
            filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
            from: 'now-6m',
            id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            immutable: false,
            index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            interval: '5m',
            rule_id: 'rule-1',
            language: 'kuery',
            license: 'Elastic License',
            output_index: '.siem-signals',
            max_signals: 10000,
            risk_score: 50,
            risk_score_mapping: [],
            rule_name_override: undefined,
            saved_id: undefined,
            name: 'Detect Root/Admin Users',
            query: 'user.name: root or user.name: admin',
            references: ['http://example.com', 'https://example.com'],
            related_integrations: [],
            required_fields: [],
            response_actions: undefined,
            setup: '',
            timeline_id: 'some-timeline-id',
            timeline_title: 'some-timeline-title',
            meta: { someMeta: 'someField' },
            severity: 'high',
            severity_mapping: [],
            updated_by: 'elastic',
            tags: [],
            to: 'now',
            type: 'query',
            threat: getThreatMock(),
            throttle: undefined,
            note: '# Investigative notes',
            version: 1,
            revision: 0,
            exceptions_list: getListArrayMock(),
            execution_summary: undefined,
            outcome: undefined,
            alias_target_id: undefined,
            alias_purpose: undefined,
            timestamp_override: undefined,
            timestamp_override_fallback_disabled: undefined,
            namespace: undefined,
            data_view_id: undefined,
            alert_suppression: undefined,
            investigation_fields: [],
          },
        ],
      };
      expect(exports).toEqual(expected);
    });

    test('it does not transform the rule if the rule is an immutable rule and designates it as a missing rule', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getRuleMock(getQueryRuleParams());
      result.params.immutable = true;

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [result],
      };

      rulesClient.get.mockResolvedValue(result);
      rulesClient.find.mockResolvedValue(findResult);

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(
        rulesClient,
        clients.savedObjectsClient,
        objects,
        logger
      );
      const expected: RulesErrors = {
        exportedCount: 0,
        missingRules: [{ rule_id: 'rule-1' }],
        rules: [],
      };
      expect(exports).toEqual(expected);
    });

    test('it exports missing rules', async () => {
      const rulesClient = rulesClientMock.create();

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [],
      };

      rulesClient.get.mockRejectedValue({ output: { statusCode: 404 } });
      rulesClient.find.mockResolvedValue(findResult);

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(
        rulesClient,
        clients.savedObjectsClient,
        objects,
        logger
      );
      const expected: RulesErrors = {
        exportedCount: 0,
        missingRules: [{ rule_id: 'rule-1' }],
        rules: [],
      };
      expect(exports).toEqual(expected);
    });
  });
});
