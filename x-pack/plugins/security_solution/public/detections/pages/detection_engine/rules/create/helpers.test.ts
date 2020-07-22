/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewRule } from '../../../../containers/detection_engine/rules';
import { AboutStepRule, ActionsStepRule, ScheduleStepRule, DefineStepRule } from '../types';
import { filterRuleFieldsForType } from '../utils';
import {
  mockDefineStepRule,
  mockScheduleStepRule,
  mockAboutStepRule,
  mockActionsStepRule,
} from '../all/__mocks__/mock';
import { formatRule } from './helpers';

describe('helpers', () => {
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

    test('returns NewRule with type of saved_query when saved_id exists', () => {
      const result: NewRule = formatRule(mockDefine, mockAbout, mockSchedule, mockActions);
      expect(result.type).toEqual('saved_query');
    });

    test('returns NewRule with type of query when saved_id does not exist', () => {
      const mockDefineStepRuleWithoutSavedId = {
        ...mockDefine,
        queryBar: {
          ...mockDefine.queryBar,
          saved_id: '',
        },
      };
      const result: NewRule = formatRule(
        mockDefineStepRuleWithoutSavedId,
        mockAbout,
        mockSchedule,
        mockActions
      );

      expect(result.type).toEqual('query');
    });

    test('returns NewRule without id if ruleId does not exist', () => {
      const result: NewRule = formatRule(mockDefine, mockAbout, mockSchedule, mockActions);
      expect(result.id).toBeUndefined();
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
