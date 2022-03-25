/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  GetStepsData,
  getDefineStepsData,
  getScheduleStepsData,
  getStepsData,
  getAboutStepsData,
  getActionsStepsData,
  getHumanizedDuration,
  getModifiedAboutDetailsData,
  getPrePackagedRuleStatus,
  getPrePackagedTimelineStatus,
  determineDetailsValue,
  userHasPermissions,
  fillEmptySeverityMappings,
} from './helpers';
import { mockRuleWithEverything, mockRule } from './all/__mocks__/mock';
import { FilterStateStore } from '@kbn/es-query';

import { Rule } from '../../../containers/detection_engine/rules';
import {
  AboutStepRule,
  AboutStepRuleDetails,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from './types';
import { getThreatMock } from '../../../../../common/detection_engine/schemas/types/threat.mock';

describe('rule helpers', () => {
  // @ts-expect-error 4.3.5 upgrade - likely requires moment upgrade
  // https://github.com/elastic/kibana/issues/120236
  moment.suppressDeprecationWarnings = true;
  describe('getStepsData', () => {
    test('returns object with about, define, schedule and actions step properties formatted', () => {
      const {
        defineRuleData,
        modifiedAboutRuleDetailsData,
        aboutRuleData,
        scheduleRuleData,
        ruleActionsData,
      }: GetStepsData = getStepsData({
        rule: mockRuleWithEverything('test-id'),
      });
      const defineRuleStepData = {
        ruleType: 'saved_query',
        anomalyThreshold: 50,
        index: ['auditbeat-*'],
        machineLearningJobId: [],
        queryBar: {
          query: {
            query: 'user.name: root or user.name: admin',
            language: 'kuery',
          },
          filters: [
            {
              $state: {
                store: FilterStateStore.GLOBAL_STATE,
              },
              meta: {
                alias: null,
                disabled: false,
                key: 'event.category',
                negate: false,
                params: {
                  query: 'file',
                },
                type: 'phrase',
              },
              query: {
                match_phrase: {
                  'event.category': 'file',
                },
              },
            },
          ],
          saved_id: 'test123',
        },
        threshold: {
          field: ['host.name'],
          value: '50',
          cardinality: {
            field: ['process.name'],
            value: '2',
          },
        },
        threatIndex: [],
        threatMapping: [],
        threatQueryBar: {
          query: {
            query: '',
            language: '',
          },
          filters: [],
          saved_id: undefined,
        },
        timeline: {
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
          title: 'Titled timeline',
        },
      };

      const aboutRuleStepData: AboutStepRule = {
        author: [],
        description: '24/7',
        falsePositives: ['test'],
        isAssociatedToEndpointList: false,
        isBuildingBlock: false,
        license: 'Elastic License',
        name: 'Query with rule-id',
        note: '# this is some markdown documentation',
        references: ['www.test.co'],
        riskScore: { value: 21, mapping: [], isMappingChecked: false },
        ruleNameOverride: 'message',
        severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
        tags: ['tag1', 'tag2'],
        threat: getThreatMock(),
        timestampOverride: 'event.ingested',
      };
      const scheduleRuleStepData = { from: '0s', interval: '5m' };
      const ruleActionsStepData = {
        enabled: true,
        throttle: 'no_actions',
        actions: [],
      };
      const aboutRuleDataDetailsData = {
        note: '# this is some markdown documentation',
        description: '24/7',
      };

      expect(defineRuleData).toEqual(defineRuleStepData);
      expect(aboutRuleData).toEqual(aboutRuleStepData);
      expect(scheduleRuleData).toEqual(scheduleRuleStepData);
      expect(ruleActionsData).toEqual(ruleActionsStepData);
      expect(modifiedAboutRuleDetailsData).toEqual(aboutRuleDataDetailsData);
    });
  });

  describe('getAboutStepsData', () => {
    test('returns name, description, and note as empty string if detailsView is true', () => {
      const result: AboutStepRule = getAboutStepsData(mockRuleWithEverything('test-id'), true);

      expect(result.name).toEqual('');
      expect(result.description).toEqual('');
      expect(result.note).toEqual('');
    });

    test('returns note as empty string if property does not exist on rule', () => {
      const mockedRule = mockRuleWithEverything('test-id');
      delete mockedRule.note;
      const result: AboutStepRule = getAboutStepsData(mockedRule, false);

      expect(result.note).toEqual('');
    });
  });

  describe('determineDetailsValue', () => {
    test('returns name, description, and note as empty string if detailsView is true', () => {
      const result: Pick<Rule, 'name' | 'description' | 'note'> = determineDetailsValue(
        mockRuleWithEverything('test-id'),
        true
      );
      const expected = { name: '', description: '', note: '' };

      expect(result).toEqual(expected);
    });

    test('returns name, description, and note values if detailsView is false', () => {
      const mockedRule = mockRuleWithEverything('test-id');
      const result: Pick<Rule, 'name' | 'description' | 'note'> = determineDetailsValue(
        mockedRule,
        false
      );
      const expected = {
        name: mockedRule.name,
        description: mockedRule.description,
        note: mockedRule.note,
      };

      expect(result).toEqual(expected);
    });

    test('returns note as empty string if property does not exist on rule', () => {
      const mockedRule = mockRuleWithEverything('test-id');
      delete mockedRule.note;
      const result: Pick<Rule, 'name' | 'description' | 'note'> = determineDetailsValue(
        mockedRule,
        false
      );
      const expected = { name: mockedRule.name, description: mockedRule.description, note: '' };

      expect(result).toEqual(expected);
    });
  });

  describe('getDefineStepsData', () => {
    test('returns with saved_id if value exists on rule', () => {
      const result: DefineStepRule = getDefineStepsData(mockRule('test-id'));
      const expected = {
        ruleType: 'saved_query',
        anomalyThreshold: 50,
        machineLearningJobId: [],
        index: ['auditbeat-*'],
        queryBar: {
          query: {
            query: '',
            language: 'kuery',
          },
          filters: [],
          saved_id: "Garrett's IP",
        },
        threshold: {
          field: [],
          value: '100',
        },
        threatIndex: [],
        threatMapping: [],
        threatQueryBar: {
          query: {
            query: '',
            language: '',
          },
          filters: [],
          saved_id: undefined,
        },
        timeline: {
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
          title: 'Untitled timeline',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns with saved_id of undefined if value does not exist on rule', () => {
      const mockedRule = {
        ...mockRule('test-id'),
      };
      delete mockedRule.saved_id;
      const result: DefineStepRule = getDefineStepsData(mockedRule);
      const expected = {
        ruleType: 'saved_query',
        anomalyThreshold: 50,
        machineLearningJobId: [],
        index: ['auditbeat-*'],
        queryBar: {
          query: {
            query: '',
            language: 'kuery',
          },
          filters: [],
          saved_id: undefined,
        },
        threshold: {
          field: [],
          value: '100',
        },
        threatIndex: [],
        threatMapping: [],
        threatQueryBar: {
          query: {
            query: '',
            language: '',
          },
          filters: [],
          saved_id: undefined,
        },
        timeline: {
          id: '86aa74d0-2136-11ea-9864-ebc8cc1cb8c2',
          title: 'Untitled timeline',
        },
      };

      expect(result).toEqual(expected);
    });

    test('returns timeline id and title of null if they do not exist on rule', () => {
      const mockedRule = mockRuleWithEverything('test-id');
      delete mockedRule.timeline_id;
      delete mockedRule.timeline_title;
      const result: DefineStepRule = getDefineStepsData(mockedRule);

      expect(result.timeline.id).toBeNull();
      expect(result.timeline.title).toBeNull();
    });
  });

  describe('getHumanizedDuration', () => {
    test('returns from as seconds if from duration is specified in seconds', () => {
      const result = getHumanizedDuration('now-62s', '1m');

      expect(result).toEqual('2s');
    });

    test('returns from as seconds if from duration is specified in seconds greater than 60', () => {
      const result = getHumanizedDuration('now-122s', '1m');

      expect(result).toEqual('62s');
    });

    test('returns from as minutes if from duration is specified in minutes', () => {
      const result = getHumanizedDuration('now-660s', '5m');

      expect(result).toEqual('6m');
    });

    test('returns from as minutes if from duration is specified in minutes greater than 60', () => {
      const result = getHumanizedDuration('now-6600s', '5m');

      expect(result).toEqual('105m');
    });

    test('returns from as hours if from duration is specified in hours', () => {
      const result = getHumanizedDuration('now-7500s', '5m');

      expect(result).toEqual('2h');
    });

    test('returns from as if from is not parsable as dateMath', () => {
      const result = getHumanizedDuration('randomstring', '5m');

      expect(result).toEqual('NaNs');
    });

    test('returns from as 5m if interval is not parsable as dateMath', () => {
      const result = getHumanizedDuration('now-300s', 'randomstring');

      expect(result).toEqual('5m');
    });
  });

  describe('getScheduleStepsData', () => {
    test('returns expected ScheduleStep rule object', () => {
      const mockedRule = {
        ...mockRule('test-id'),
      };
      const result: ScheduleStepRule = getScheduleStepsData(mockedRule);
      const expected = {
        interval: mockedRule.interval,
        from: '0s',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('getActionsStepsData', () => {
    test('returns expected ActionsStepRule rule object', () => {
      const mockedRule = {
        ...mockRule('test-id'),
        actions: [
          {
            id: 'id',
            group: 'group',
            params: {},
            action_type_id: 'action_type_id',
          },
        ],
      };
      const result: ActionsStepRule = getActionsStepsData(mockedRule);
      const expected = {
        actions: [
          {
            id: 'id',
            group: 'group',
            params: {},
            actionTypeId: 'action_type_id',
          },
        ],
        enabled: mockedRule.enabled,
        throttle: 'no_actions',
      };

      expect(result).toEqual(expected);
    });
  });

  describe('getModifiedAboutDetailsData', () => {
    test('returns object with "note" and "description" being those of passed in rule', () => {
      const result: AboutStepRuleDetails = getModifiedAboutDetailsData(
        mockRuleWithEverything('test-id')
      );
      const aboutRuleDataDetailsData = {
        note: '# this is some markdown documentation',
        description: '24/7',
      };

      expect(result).toEqual(aboutRuleDataDetailsData);
    });

    test('returns "note" with empty string if "note" does not exist', () => {
      const { note, ...mockRuleWithoutNote } = { ...mockRuleWithEverything('test-id') };
      const result: AboutStepRuleDetails = getModifiedAboutDetailsData(mockRuleWithoutNote);

      const aboutRuleDetailsData = { note: '', description: mockRuleWithoutNote.description };

      expect(result).toEqual(aboutRuleDetailsData);
    });
  });

  describe('userHasPermissions', () => {
    test("returns true when user's CRUD operations are null", () => {
      const result: boolean = userHasPermissions(null);
      const userHasPermissionsExpectedResult = true;

      expect(result).toEqual(userHasPermissionsExpectedResult);
    });

    test('returns false when user cannot CRUD', () => {
      const result: boolean = userHasPermissions(false);
      const userHasPermissionsExpectedResult = false;

      expect(result).toEqual(userHasPermissionsExpectedResult);
    });

    test('returns true when user can CRUD', () => {
      const result: boolean = userHasPermissions(true);
      const userHasPermissionsExpectedResult = true;

      expect(result).toEqual(userHasPermissionsExpectedResult);
    });
  });

  describe('getPrePackagedRuleStatus', () => {
    test('ruleNotInstalled', () => {
      const rulesInstalled = 0;
      const rulesNotInstalled = 1;
      const rulesNotUpdated = 0;
      const result: string = getPrePackagedRuleStatus(
        rulesInstalled,
        rulesNotInstalled,
        rulesNotUpdated
      );

      expect(result).toEqual('ruleNotInstalled');
    });

    test('ruleInstalled', () => {
      const rulesInstalled = 1;
      const rulesNotInstalled = 0;
      const rulesNotUpdated = 0;
      const result: string = getPrePackagedRuleStatus(
        rulesInstalled,
        rulesNotInstalled,
        rulesNotUpdated
      );

      expect(result).toEqual('ruleInstalled');
    });

    test('someRuleUninstall', () => {
      const rulesInstalled = 1;
      const rulesNotInstalled = 1;
      const rulesNotUpdated = 0;
      const result: string = getPrePackagedRuleStatus(
        rulesInstalled,
        rulesNotInstalled,
        rulesNotUpdated
      );

      expect(result).toEqual('someRuleUninstall');
    });

    test('ruleNeedUpdate', () => {
      const rulesInstalled = 1;
      const rulesNotInstalled = 0;
      const rulesNotUpdated = 1;
      const result: string = getPrePackagedRuleStatus(
        rulesInstalled,
        rulesNotInstalled,
        rulesNotUpdated
      );

      expect(result).toEqual('ruleNeedUpdate');
    });

    test('unknown', () => {
      const rulesInstalled = null;
      const rulesNotInstalled = null;
      const rulesNotUpdated = null;
      const result: string = getPrePackagedRuleStatus(
        rulesInstalled,
        rulesNotInstalled,
        rulesNotUpdated
      );

      expect(result).toEqual('unknown');
    });
  });

  describe('getPrePackagedTimelineStatus', () => {
    test('timelinesNotInstalled', () => {
      const timelinesInstalled = 0;
      const timelinesNotInstalled = 1;
      const timelinesNotUpdated = 0;
      const result: string = getPrePackagedTimelineStatus(
        timelinesInstalled,
        timelinesNotInstalled,
        timelinesNotUpdated
      );

      expect(result).toEqual('timelinesNotInstalled');
    });

    test('timelinesInstalled', () => {
      const timelinesInstalled = 1;
      const timelinesNotInstalled = 0;
      const timelinesNotUpdated = 0;
      const result: string = getPrePackagedTimelineStatus(
        timelinesInstalled,
        timelinesNotInstalled,
        timelinesNotUpdated
      );

      expect(result).toEqual('timelinesInstalled');
    });

    test('someTimelineUninstall', () => {
      const timelinesInstalled = 1;
      const timelinesNotInstalled = 1;
      const timelinesNotUpdated = 0;
      const result: string = getPrePackagedTimelineStatus(
        timelinesInstalled,
        timelinesNotInstalled,
        timelinesNotUpdated
      );

      expect(result).toEqual('someTimelineUninstall');
    });

    test('timelineNeedUpdate', () => {
      const timelinesInstalled = 1;
      const timelinesNotInstalled = 0;
      const timelinesNotUpdated = 1;
      const result: string = getPrePackagedTimelineStatus(
        timelinesInstalled,
        timelinesNotInstalled,
        timelinesNotUpdated
      );

      expect(result).toEqual('timelineNeedUpdate');
    });

    test('unknown', () => {
      const timelinesInstalled = null;
      const timelinesNotInstalled = null;
      const timelinesNotUpdated = null;
      const result: string = getPrePackagedTimelineStatus(
        timelinesInstalled,
        timelinesNotInstalled,
        timelinesNotUpdated
      );

      expect(result).toEqual('unknown');
    });
  });
});
