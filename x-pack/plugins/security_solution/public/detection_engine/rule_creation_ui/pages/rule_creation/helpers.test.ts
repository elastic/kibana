/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import type { CreateRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import type { Rule } from '../../../rule_management/logic';
import {
  getListMock,
  getEndpointListMock,
} from '../../../../../common/detection_engine/schemas/types/lists.mock';
import type {
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  ActionsStepRuleJson,
  AboutStepRule,
  ActionsStepRule,
  ScheduleStepRule,
  DefineStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';
import {
  getTimeTypeValue,
  formatDefineStepData,
  formatScheduleStepData,
  formatAboutStepData,
  formatActionsStepData,
  formatRule,
  filterRuleFieldsForType,
  filterEmptyThreats,
} from './helpers';
import {
  mockDefineStepRule,
  mockQueryBar,
  mockScheduleStepRule,
  mockAboutStepRule,
  mockActionsStepRule,
} from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { getThreatMock } from '../../../../../common/detection_engine/schemas/types/threat.mock';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';

describe('helpers', () => {
  describe('getTimeTypeValue', () => {
    test('returns timeObj with value 0 if no time value found', () => {
      const result = getTimeTypeValue('m');

      expect(result).toEqual({ unit: 'm', value: 0 });
    });

    test('returns timeObj with unit set to default unit value of "ms" if no expected time type found', () => {
      const result = getTimeTypeValue('5l');

      expect(result).toEqual({ unit: 'ms', value: 5 });
    });

    test('returns timeObj with unit of s and value 5 when time is 5s ', () => {
      const result = getTimeTypeValue('5s');

      expect(result).toEqual({ unit: 's', value: 5 });
    });

    test('returns timeObj with unit of m and value 5 when time is 5m ', () => {
      const result = getTimeTypeValue('5m');

      expect(result).toEqual({ unit: 'm', value: 5 });
    });

    test('returns timeObj with unit of h and value 5 when time is 5h ', () => {
      const result = getTimeTypeValue('5h');

      expect(result).toEqual({ unit: 'h', value: 5 });
    });

    test('returns timeObj with value of 5 when time is float like 5.6m ', () => {
      const result = getTimeTypeValue('5m');

      expect(result).toEqual({ unit: 'm', value: 5 });
    });

    test('returns timeObj with value of 0 and unit of "ms" if random string passed in', () => {
      const result = getTimeTypeValue('random');

      expect(result).toEqual({ unit: 'ms', value: 0 });
    });
  });

  describe('filterEmptyThreats', () => {
    let mockThreat: Threat;

    beforeEach(() => {
      mockThreat = mockAboutStepRule().threat[0];
    });

    test('filters out fields with empty tactics', () => {
      const threat: Threats = [
        mockThreat,
        { ...mockThreat, tactic: { ...mockThreat.tactic, name: 'none' } },
      ];
      const result = filterEmptyThreats(threat);
      const expected: Threats = [mockThreat];
      expect(result).toEqual(expected);
    });
  });

  describe('formatDefineStepData', () => {
    let mockData: DefineStepRule;

    beforeEach(() => {
      mockData = mockDefineStepRule();
    });

    test('returns formatted object as DefineStepRuleJson', () => {
      const result = formatDefineStepData(mockData);
      const expected: DefineStepRuleJson = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        type: 'query',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    describe('saved_query and query rule types', () => {
      test('returns query rule if savedId provided but shouldLoadQueryDynamically != true', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: 'mock-test-id',
          },
          ruleType: 'query',
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBeUndefined();
        expect(result.type).toBe('query');
        expect(result.query).toBe('test query');
      });

      test('returns query rule if shouldLoadQueryDynamically = true and savedId not provided for rule type query', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: null,
          },
          ruleType: 'query',
          shouldLoadQueryDynamically: true,
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBeUndefined();
        expect(result.type).toBe('query');
        expect(result.query).toBe('test query');
      });

      test('returns query rule if shouldLoadQueryDynamically = true and savedId not provided for rule type saved_query', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: null,
          },
          ruleType: 'saved_query',
          shouldLoadQueryDynamically: true,
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBeUndefined();
        expect(result.type).toBe('query');
        expect(result.query).toBe('test query');
      });

      test('returns query rule type if savedId provided but shouldLoadQueryDynamically != true and rule type is saved_query', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: 'mock-test-id',
          },
          ruleType: 'saved_query',
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBeUndefined();
        expect(result.type).toBe('query');
        expect(result.query).toBe('test query');
      });

      test('returns saved_query rule if shouldLoadQueryDynamically = true and savedId provided for rule type query', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: 'mock-test-id',
          },
          ruleType: 'query',
          shouldLoadQueryDynamically: true,
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBe('mock-test-id');
        expect(result.type).toBe('saved_query');
        expect(result.query).toBeUndefined();
      });

      test('returns saved_query rule if shouldLoadQueryDynamically = true and savedId provided for rule type saved_query', () => {
        const mockStepData: DefineStepRule = {
          ...mockData,
          queryBar: {
            ...mockData.queryBar,
            saved_id: 'mock-test-id',
          },
          ruleType: 'saved_query',
          shouldLoadQueryDynamically: true,
        };
        const result = formatDefineStepData(mockStepData);

        expect(result.saved_id).toBe('mock-test-id');
        expect(result.type).toBe('saved_query');
        expect(result.query).toBeUndefined();
      });
    });

    test('returns undefined timeline_id and timeline_title if timeline.id is undefined', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
      };
      // @ts-expect-error
      delete mockStepData.timeline.id;

      const result = formatDefineStepData(mockStepData);

      expect(result.timeline_id).toBeUndefined();
      expect(result.timeline_title).toBeUndefined();
    });

    test('returns formatted timeline_id and timeline_title if timeline.id is empty string', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '',
        },
      };
      const result = formatDefineStepData(mockStepData);

      expect(result.timeline_id).toBe('');
      expect(result.timeline_title).toEqual('Titled timeline');
    });

    test('returns undefined timeline_id and timeline_title if timeline.title is undefined', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        },
      };
      // @ts-expect-error
      delete mockStepData.timeline.title;
      const result = formatDefineStepData(mockStepData);

      expect(result.timeline_id).toBeUndefined();
      expect(result.timeline_title).toBeUndefined();
    });

    test('returns formatted object with timeline_id and timeline_title if timeline.title is empty string', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          title: '',
        },
      };
      const result = formatDefineStepData(mockStepData);

      expect(result.timeline_id).toBe('86aa74d0-2136-11ea-9864-ebc8cc1cb8c2');
      expect(result.timeline_title).toEqual('');
    });

    test('returns ML fields if type is machine_learning', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        ruleType: 'machine_learning',
        anomalyThreshold: 44,
        machineLearningJobId: ['some_jobert_id'],
      };
      const result = formatDefineStepData(mockStepData);

      const expected: DefineStepRuleJson = {
        type: 'machine_learning',
        anomaly_threshold: 44,
        machine_learning_job_id: ['some_jobert_id'],
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns query fields if type is eql', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        ruleType: 'eql',
        queryBar: {
          ...mockData.queryBar,
          query: {
            ...mockData.queryBar.query,
            language: 'eql',
            query: 'process where process_name == "explorer.exe"',
          },
        },
      };
      const result = formatDefineStepData(mockStepData);

      const expected: DefineStepRuleJson = {
        filters: mockStepData.queryBar.filters,
        index: mockStepData.index,
        language: 'eql',
        query: 'process where process_name == "explorer.exe"',
        type: 'eql',
      };

      expect(result).toEqual(expect.objectContaining(expected));
    });

    test('returns option fields if specified for eql type', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        ruleType: 'eql',
        queryBar: {
          ...mockData.queryBar,
          query: {
            ...mockData.queryBar.query,
            language: 'eql',
            query: 'process where process_name == "explorer.exe"',
          },
        },
        eqlOptions: {
          timestampField: 'event.created',
          tiebreakerField: 'process.name',
          eventCategoryField: 'event.action',
        },
      };
      const result = formatDefineStepData(mockStepData);

      const expected: DefineStepRuleJson = {
        filters: mockStepData.queryBar.filters,
        index: mockStepData.index,
        language: 'eql',
        query: 'process where process_name == "explorer.exe"',
        type: 'eql',
        timestamp_field: 'event.created',
        tiebreaker_field: 'process.name',
        event_category_override: 'event.action',
      };

      expect(result).toEqual(expect.objectContaining(expected));
    });

    test('returns expected indicator matching rule type if all fields are filled out', () => {
      const threatFilters: DefineStepRule['threatQueryBar']['filters'] = [
        {
          meta: { alias: '', disabled: false, negate: false },
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [{ exists: { field: 'host.name' } }],
                  },
                },
                {},
              ],
              must: [],
              must_not: [],
              should: [],
            },
          },
        },
      ];
      const threatMapping: DefineStepRule['threatMapping'] = [
        {
          entries: [
            {
              field: 'host.name',
              type: 'mapping',
              value: 'host.name',
            },
          ],
        },
      ];
      const mockStepData: DefineStepRule = {
        ...mockData,
        ruleType: 'threat_match',
        threatIndex: ['index_1', 'index_2'],
        threatQueryBar: {
          query: { language: 'kql', query: 'threat_host: *' },
          filters: threatFilters,
          saved_id: null,
        },
        threatMapping,
      };
      const result = formatDefineStepData(mockStepData);

      const expected: DefineStepRuleJson = {
        language: 'kuery',
        query: 'test query',
        saved_id: 'test123',
        type: 'threat_match',
        threat_query: 'threat_host: *',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
        threat_mapping: threatMapping,
        threat_language: mockStepData.threatQueryBar.query.language,
        filters: mockStepData.queryBar.filters,
        threat_index: mockStepData.threatIndex,
        index: mockStepData.index,
        threat_filters: threatFilters,
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatScheduleStepData', () => {
    let mockData: ScheduleStepRule;

    beforeEach(() => {
      mockData = mockScheduleStepRule();
    });

    test('returns formatted object as ScheduleStepRuleJson', () => {
      const result = formatScheduleStepData(mockData);
      const expected: ScheduleStepRuleJson = {
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with "to" as "now" if "to" not supplied', () => {
      const mockStepData: ScheduleStepRule = {
        ...mockData,
      };
      delete mockStepData.to;
      const result = formatScheduleStepData(mockStepData);
      const expected: ScheduleStepRuleJson = {
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with "to" as "now" if "to" random string', () => {
      const mockStepData: ScheduleStepRule = {
        ...mockData,
        to: 'random',
      };
      const result = formatScheduleStepData(mockStepData);
      const expected: ScheduleStepRuleJson = {
        from: 'now-660s',
        to: 'now',
        interval: '5m',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object  if "from" random string', () => {
      const mockStepData: ScheduleStepRule = {
        ...mockData,
        from: 'random',
      };
      const result = formatScheduleStepData(mockStepData);
      const expected: ScheduleStepRuleJson = {
        from: 'now-300s',
        to: 'now',
        interval: '5m',
        meta: {
          from: 'random',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object  if "interval" random string', () => {
      const mockStepData: ScheduleStepRule = {
        ...mockData,
        interval: 'random',
      };
      const result = formatScheduleStepData(mockStepData);
      const expected: ScheduleStepRuleJson = {
        from: 'now-360s',
        to: 'now',
        interval: 'random',
        meta: {
          from: '6m',
        },
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatAboutStepData', () => {
    let mockData: AboutStepRule;

    beforeEach(() => {
      mockData = mockAboutStepRule();
    });

    test('returns formatted object as AboutStepRuleJson', () => {
      const result = formatAboutStepData(mockData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        description: '24/7',
        false_positives: ['test'],
        license: 'Elastic License',
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with endpoint exceptions_list', () => {
      const result = formatAboutStepData(
        {
          ...mockData,
          isAssociatedToEndpointList: true,
        },
        []
      );
      expect(result.exceptions_list).toEqual([getEndpointListMock()]);
    });

    test('returns formatted object with detections exceptions_list', () => {
      const result = formatAboutStepData(mockData, [getListMock()]);
      expect(result.exceptions_list).toEqual([getListMock()]);
    });

    test('returns a threat indicator path', () => {
      mockData = {
        ...mockData,
        threatIndicatorPath: 'my_custom.path',
      };
      const result = formatAboutStepData(mockData);
      expect(result.threat_indicator_path).toEqual('my_custom.path');
    });

    test('returns formatted object with both exceptions_lists', () => {
      const result = formatAboutStepData(
        {
          ...mockData,
          isAssociatedToEndpointList: true,
        },
        [getListMock()]
      );
      expect(result.exceptions_list).toEqual([getEndpointListMock(), getListMock()]);
    });

    test('returns formatted object with pre-existing exceptions lists', () => {
      const exceptionsLists: List[] = [getEndpointListMock(), getListMock()];
      const result = formatAboutStepData(
        {
          ...mockData,
          isAssociatedToEndpointList: true,
        },
        exceptionsLists
      );
      expect(result.exceptions_list).toEqual(exceptionsLists);
    });

    test('returns formatted object with pre-existing endpoint exceptions list disabled', () => {
      const exceptionsLists: List[] = [getEndpointListMock(), getListMock()];
      const result = formatAboutStepData(mockData, exceptionsLists);
      expect(result.exceptions_list).toEqual([getListMock()]);
    });

    test('returns formatted object with empty falsePositive and references filtered out', () => {
      const mockStepData: AboutStepRule = {
        ...mockData,
        falsePositives: ['', 'test', ''],
        references: ['www.test.co', ''],
      };
      const result = formatAboutStepData(mockStepData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        description: '24/7',
        false_positives: ['test'],
        license: 'Elastic License',
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without note if note is empty string', () => {
      const mockStepData: AboutStepRule = {
        ...mockData,
        note: '',
      };
      const result = formatAboutStepData(mockStepData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        description: '24/7',
        false_positives: ['test'],
        license: 'Elastic License',
        name: 'Query with rule-id',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with threats filtered out where tactic.name is "none"', () => {
      const mockStepData: AboutStepRule = {
        ...mockData,
        threat: [
          ...getThreatMock(),
          {
            framework: 'mockFramework',
            tactic: {
              id: '1234',
              name: 'none',
              reference: 'reference1',
            },
            technique: [
              {
                id: '456',
                name: 'technique1',
                reference: 'technique reference',
                subtechnique: [],
              },
            ],
          },
        ],
      };
      const result = formatAboutStepData(mockStepData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        license: 'Elastic License',
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with threats that contains no subtechniques', () => {
      const mockStepData: AboutStepRule = {
        ...mockData,
        threat: [
          ...getThreatMock(),
          {
            framework: 'mockFramework',
            tactic: {
              id: '1234',
              name: 'tactic1',
              reference: 'reference1',
            },
            technique: [
              {
                id: '456',
                name: 'technique1',
                reference: 'technique reference',
                subtechnique: [],
              },
            ],
          },
        ],
      };
      const result = formatAboutStepData(mockStepData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        license: 'Elastic License',
        description: '24/7',
        false_positives: ['test'],
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: [
          ...getThreatMock(),
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: '1234', name: 'tactic1', reference: 'reference1' },
            technique: [
              { id: '456', name: 'technique1', reference: 'technique reference', subtechnique: [] },
            ],
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with timestamp override', () => {
      const mockStepData: AboutStepRule = {
        ...mockData,
        timestampOverride: 'event.ingest',
        timestampOverrideFallbackDisabled: true,
      };
      const result = formatAboutStepData(mockStepData);
      const expected: AboutStepRuleJson = {
        author: ['Elastic'],
        description: '24/7',
        false_positives: ['test'],
        license: 'Elastic License',
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
        timestamp_override: 'event.ingest',
        timestamp_override_fallback_disabled: true,
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatActionsStepData', () => {
    let mockData: ActionsStepRule;

    beforeEach(() => {
      mockData = mockActionsStepRule();
    });

    test('returns formatted object as ActionsStepRuleJson', () => {
      const result = formatActionsStepData(mockData);
      const expected: ActionsStepRuleJson = {
        actions: [],
        enabled: false,
        meta: {
          kibana_siem_app_url: 'http://localhost:5601/app/siem',
        },
        throttle: 'no_actions',
      };

      expect(result).toEqual(expected);
    });

    test('returns proper throttle value for no_actions', () => {
      const mockStepData: ActionsStepRule = {
        ...mockData,
        throttle: 'no_actions',
      };
      const result = formatActionsStepData(mockStepData);
      const expected: ActionsStepRuleJson = {
        actions: [],
        enabled: false,
        meta: {
          kibana_siem_app_url: mockStepData.kibanaSiemAppUrl,
        },
        throttle: 'no_actions',
      };

      expect(result).toEqual(expected);
    });

    test('returns proper throttle value for rule', () => {
      const mockStepData: ActionsStepRule = {
        ...mockData,
        throttle: 'rule',
        actions: [
          {
            group: 'default',
            id: 'id',
            actionTypeId: 'actionTypeId',
            params: {},
          },
        ],
      };
      const result = formatActionsStepData(mockStepData);
      const expected: ActionsStepRuleJson = {
        actions: [
          {
            group: mockStepData.actions[0].group,
            id: mockStepData.actions[0].id,
            action_type_id: mockStepData.actions[0].actionTypeId,
            params: mockStepData.actions[0].params,
          },
        ],
        enabled: false,
        meta: {
          kibana_siem_app_url: mockStepData.kibanaSiemAppUrl,
        },
        throttle: 'rule',
      };

      expect(result).toEqual(expected);
    });

    test('returns proper throttle value for interval', () => {
      const mockStepData: ActionsStepRule = {
        ...mockData,
        throttle: '1d',
        actions: [
          {
            group: 'default',
            id: 'id',
            actionTypeId: 'actionTypeId',
            params: {},
          },
        ],
      };
      const result = formatActionsStepData(mockStepData);
      const expected: ActionsStepRuleJson = {
        actions: [
          {
            group: mockStepData.actions[0].group,
            id: mockStepData.actions[0].id,
            action_type_id: mockStepData.actions[0].actionTypeId,
            params: mockStepData.actions[0].params,
          },
        ],
        enabled: false,
        meta: {
          kibana_siem_app_url: mockStepData.kibanaSiemAppUrl,
        },
        throttle: mockStepData.throttle,
      };

      expect(result).toEqual(expected);
    });

    test('returns actions with action_type_id', () => {
      const mockAction = {
        group: 'default',
        id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
        params: { message: 'ML Rule generated {{state.signals_count}} alerts' },
        actionTypeId: '.slack',
      };

      const mockStepData: ActionsStepRule = {
        ...mockData,
        actions: [mockAction],
      };
      const result = formatActionsStepData(mockStepData);
      const expected: ActionsStepRuleJson = {
        actions: [
          {
            group: mockAction.group,
            id: mockAction.id,
            params: mockAction.params,
            action_type_id: mockAction.actionTypeId,
          },
        ],
        enabled: false,
        meta: {
          kibana_siem_app_url: mockStepData.kibanaSiemAppUrl,
        },
        throttle: 'no_actions',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('formatRule', () => {
    let mockAbout: AboutStepRule;
    let mockDefine: DefineStepRule;
    let mockSchedule: ScheduleStepRule;
    let mockActions: ActionsStepRule;

    beforeEach(() => {
      mockAbout = mockAboutStepRule();
      mockDefine = mockDefineStepRule();
      mockSchedule = mockScheduleStepRule();
      mockActions = mockActionsStepRule();
    });

    test('returns rule with type of query when saved_id exists but shouldLoadQueryDynamically=false', () => {
      const result = formatRule<Rule>(mockDefine, mockAbout, mockSchedule, mockActions);

      expect(result.type).toEqual('query');
    });

    test('returns rule with type of saved_query when saved_id exists and shouldLoadQueryDynamically=true', () => {
      const result = formatRule<Rule>(
        { ...mockDefine, shouldLoadQueryDynamically: true },
        mockAbout,
        mockSchedule,
        mockActions
      );

      expect(result.type).toEqual('saved_query');
    });

    test('returns rule with type of query when saved_id does not exist', () => {
      const mockDefineStepRuleWithoutSavedId: DefineStepRule = {
        ...mockDefine,
        queryBar: {
          ...mockDefine.queryBar,
          saved_id: '',
        },
      };
      const result = formatRule<CreateRulesSchema>(
        mockDefineStepRuleWithoutSavedId,
        mockAbout,
        mockSchedule,
        mockActions
      );

      expect(result.type).toEqual('query');
    });

    test('returns rule without id if ruleId does not exist', () => {
      const result = formatRule<CreateRulesSchema>(
        mockDefine,
        mockAbout,
        mockSchedule,
        mockActions
      );

      expect(result).not.toHaveProperty<CreateRulesSchema>('id');
    });
  });

  describe('filterRuleFieldsForType', () => {
    let fields: DefineStepRule;

    beforeEach(() => {
      fields = mockDefineStepRule();
    });

    it('removes query fields if the type is machine learning', () => {
      const result = filterRuleFieldsForType(fields, 'machine_learning');
      expect(result).not.toHaveProperty('index');
      expect(result).not.toHaveProperty('queryBar');
    });

    it('leaves ML fields if the type is machine learning', () => {
      const result = filterRuleFieldsForType(fields, 'machine_learning');
      expect(result).toHaveProperty('anomalyThreshold');
      expect(result).toHaveProperty('machineLearningJobId');
    });

    it('leaves arbitrary fields if the type is machine learning', () => {
      const result = filterRuleFieldsForType(fields, 'machine_learning');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('ruleType');
    });

    it('removes ML fields if the type is not machine learning', () => {
      const result = filterRuleFieldsForType(fields, 'query');
      expect(result).not.toHaveProperty('anomalyThreshold');
      expect(result).not.toHaveProperty('machineLearningJobId');
    });

    it('leaves query fields if the type is query', () => {
      const result = filterRuleFieldsForType(fields, 'query');
      expect(result).toHaveProperty('index');
      expect(result).toHaveProperty('queryBar');
    });

    it('leaves arbitrary fields if the type is query', () => {
      const result = filterRuleFieldsForType(fields, 'query');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('ruleType');
    });
  });
});
