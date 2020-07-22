/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockAboutStepRule,
  mockActionsStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
  mockQueryBar,
} from './all/__mocks__/mock';
import {
  DefineStepRule,
  DefineStepRuleJson,
  ScheduleStepRule,
  ScheduleStepRuleJson,
  AboutStepRule,
  AboutStepRuleJson,
  ActionsStepRule,
  ActionsStepRuleJson,
} from './types';
import {
  getBreadcrumbs,
  getTimeTypeValue,
  formatAboutStepData,
  formatActionsStepData,
  formatDefineStepData,
  formatScheduleStepData,
} from './utils';

const getUrlForAppMock = (appId: string, options?: { path?: string; absolute?: boolean }) =>
  `${appId}${options?.path ?? ''}`;

describe('getBreadcrumbs', () => {
  it('returns default value for incorrect params', () => {
    expect(
      getBreadcrumbs(
        {
          pageName: 'pageName',
          detailName: 'detailName',
          tabName: undefined,
          search: '',
          pathName: 'pathName',
        },
        [],
        getUrlForAppMock
      )
    ).toEqual([{ href: 'securitySolution:detections', text: 'Detection alerts' }]);
  });
});

describe('helper_utils', () => {
  describe('getTimeTypeValue', () => {
    test('returns timeObj with value 0 if no time value found', () => {
      const result = getTimeTypeValue('m');

      expect(result).toEqual({ unit: 'm', value: 0 });
    });

    test('returns timeObj with unit set to empty string if no expected time type found', () => {
      const result = getTimeTypeValue('5l');

      expect(result).toEqual({ unit: '', value: 5 });
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

    test('returns timeObj with value of 0 and unit of "" if random string passed in', () => {
      const result = getTimeTypeValue('random');

      expect(result).toEqual({ unit: '', value: 0 });
    });
  });

  describe('formatDefineStepData', () => {
    let mockData: DefineStepRule;

    beforeEach(() => {
      mockData = mockDefineStepRule();
    });

    test('returns formatted object as DefineStepRuleJson', () => {
      const result: DefineStepRuleJson = formatDefineStepData(mockData);
      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        saved_id: 'test123',
        index: ['filebeat-'],
        type: 'saved_query',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with no saved_id if no savedId provided', () => {
      const mockStepData = {
        ...mockData,
        queryBar: {
          ...mockData.queryBar,
          saved_id: '',
        },
      };
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);
      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        saved_id: '',
        type: 'query',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without timeline_id and timeline_title if timeline.id is null', () => {
      const mockStepData = {
        ...mockData,
      };
      delete mockStepData.timeline.id;

      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);

      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        saved_id: 'test123',
        type: 'saved_query',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with timeline_id and timeline_title if timeline.id is "', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '',
        },
      };
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);

      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        saved_id: 'test123',
        type: 'saved_query',
        timeline_id: '',
        timeline_title: 'Titled timeline',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without timeline_id and timeline_title if timeline.title is null', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        },
      };
      delete mockStepData.timeline.title;
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);

      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        saved_id: 'test123',
        type: 'saved_query',
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with timeline_id and timeline_title if timeline.title is "', () => {
      const mockStepData = {
        ...mockData,
        timeline: {
          ...mockData.timeline,
          title: '',
        },
      };
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);

      const expected = {
        language: 'kuery',
        filters: mockQueryBar.filters,
        query: 'test query',
        index: ['filebeat-'],
        saved_id: 'test123',
        type: 'saved_query',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: '',
      };

      expect(result).toEqual(expected);
    });

    test('returns ML fields if type is machine_learning', () => {
      const mockStepData: DefineStepRule = {
        ...mockData,
        ruleType: 'machine_learning',
        anomalyThreshold: 44,
        machineLearningJobId: 'some_jobert_id',
      };
      const result: DefineStepRuleJson = formatDefineStepData(mockStepData);

      const expected = {
        type: 'machine_learning',
        anomaly_threshold: 44,
        machine_learning_job_id: 'some_jobert_id',
        timeline_id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
        timeline_title: 'Titled timeline',
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
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockData);
      const expected = {
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
      const mockStepData = {
        ...mockData,
      };
      delete mockStepData.to;
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
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
      const mockStepData = {
        ...mockData,
        to: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
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
      const mockStepData = {
        ...mockData,
        from: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
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
      const mockStepData = {
        ...mockData,
        interval: 'random',
      };
      const result: ScheduleStepRuleJson = formatScheduleStepData(mockStepData);
      const expected = {
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
      const result: AboutStepRuleJson = formatAboutStepData(mockData);
      const expected = {
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
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
              },
            ],
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with empty falsePositive and references filtered out', () => {
      const mockStepData = {
        ...mockData,
        falsePositives: ['', 'test', ''],
        references: ['www.test.co', ''],
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
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
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
              },
            ],
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object without note if note is empty string', () => {
      const mockStepData = {
        ...mockData,
        note: '',
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
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
        threat: [
          {
            framework: 'MITRE ATT&CK',
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
              },
            ],
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test('returns formatted object with threats filtered out where tactic.name is "none"', () => {
      const mockStepData = {
        ...mockData,
        threat: [
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
              },
            ],
          },
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
              },
            ],
          },
        ],
      };
      const result: AboutStepRuleJson = formatAboutStepData(mockStepData);
      const expected = {
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
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: '1234', name: 'tactic1', reference: 'reference1' },
            technique: [{ id: '456', name: 'technique1', reference: 'technique reference' }],
          },
        ],
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
      const result: ActionsStepRuleJson = formatActionsStepData(mockData);
      const expected = {
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
      const mockStepData = {
        ...mockData,
        throttle: 'no_actions',
      };
      const result: ActionsStepRuleJson = formatActionsStepData(mockStepData);
      const expected = {
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
      const mockStepData = {
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
      const result: ActionsStepRuleJson = formatActionsStepData(mockStepData);
      const expected = {
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
      const mockStepData = {
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
      const result: ActionsStepRuleJson = formatActionsStepData(mockStepData);
      const expected = {
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

      const mockStepData = {
        ...mockData,
        actions: [mockAction],
      };
      const result: ActionsStepRuleJson = formatActionsStepData(mockStepData);
      const expected = {
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
});
