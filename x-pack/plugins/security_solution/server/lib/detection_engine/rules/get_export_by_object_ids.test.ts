/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExportByObjectIds, getRulesFromObjects, RulesErrors } from './get_export_by_object_ids';
import {
  getAlertMock,
  getFindResultWithSingleHit,
  FindHit,
} from '../routes/__mocks__/request_responses';
import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import { getThreatMock } from '../../../../common/detection_engine/schemas/types/threat.mock';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('get_export_by_object_ids - %s', (_, isRuleRegistryEnabled) => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  describe('getExportByObjectIds', () => {
    test('it exports object ids into an expected string with new line characters', async () => {
      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(rulesClient, objects, isRuleRegistryEnabled);
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
          throttle: 'no_actions',
          note: '# Investigative notes',
          version: 1,
          exceptions_list: getListArrayMock(),
        },
        exportDetails: {
          exported_count: 1,
          missing_rules: [],
          missing_rules_count: 0,
        },
      });
    });

    test('it does not export immutable rules', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      result.params.immutable = true;

      const findResult: FindHit = {
        page: 1,
        perPage: 1,
        total: 0,
        data: [result],
      };

      rulesClient.get.mockResolvedValue(getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()));
      rulesClient.find.mockResolvedValue(findResult);

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getExportByObjectIds(rulesClient, objects, isRuleRegistryEnabled);
      expect(exports).toEqual({
        rulesNdjson: '',
        exportDetails:
          '{"exported_count":0,"missing_rules":[{"rule_id":"rule-1"}],"missing_rules_count":1}\n',
      });
    });
  });

  describe('getRulesFromObjects', () => {
    test('it returns transformed rules from objects sent in', async () => {
      const rulesClient = rulesClientMock.create();
      rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));

      const objects = [{ rule_id: 'rule-1' }];
      const exports = await getRulesFromObjects(rulesClient, objects, isRuleRegistryEnabled);
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
            last_failure_at: undefined,
            last_failure_message: undefined,
            last_success_at: undefined,
            last_success_message: undefined,
            license: 'Elastic License',
            output_index: '.siem-signals',
            max_signals: 10000,
            risk_score: 50,
            risk_score_mapping: [],
            rule_name_override: undefined,
            saved_id: undefined,
            status: undefined,
            status_date: undefined,
            name: 'Detect Root/Admin Users',
            query: 'user.name: root or user.name: admin',
            references: ['http://example.com', 'https://example.com'],
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
            throttle: 'no_actions',
            note: '# Investigative notes',
            version: 1,
            exceptions_list: getListArrayMock(),
          },
        ],
      };
      expect(exports).toEqual(expected);
    });

    test('it does not transform the rule if the rule is an immutable rule and designates it as a missing rule', async () => {
      const rulesClient = rulesClientMock.create();
      const result = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
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
      const exports = await getRulesFromObjects(rulesClient, objects, isRuleRegistryEnabled);
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
      const exports = await getRulesFromObjects(rulesClient, objects, isRuleRegistryEnabled);
      const expected: RulesErrors = {
        exportedCount: 0,
        missingRules: [{ rule_id: 'rule-1' }],
        rules: [],
      };
      expect(exports).toEqual(expected);
    });
  });
});
