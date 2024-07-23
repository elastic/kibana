/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GlobalDataTag } from '../../../common/types';

import { AgentPolicyBaseSchema } from './agent_policy';

describe('AgentPolicyBaseSchema', () => {
  describe('global_data_tags validations', () => {
    it('should throw an error if provided with duplicate tag names', () => {
      const tags: GlobalDataTag[] = [
        {
          name: 'testName',
          value: 'testValue',
        },
        {
          name: 'testName',
          value: 'testValue2',
        },
        {
          name: 'anotherName',
          value: 'value',
        },
        {
          name: 'anotherName',
          value: 'value2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found duplicate tag names: ['testName', 'anotherName'], duplicate tag names are not allowed.`
      );
    });

    it('should throw an error if provided with tag names with spaces in it', () => {
      const tags: GlobalDataTag[] = [
        {
          name: ' testName',
          value: 'testValue',
        },
        {
          name: 'test Name',
          value: 'testValue2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found tag names with spaces: [' testName', 'test Name'], tag names with spaces are not allowed.`
      );
    });

    it('should throw an error showing all validation errors', () => {
      const tags: GlobalDataTag[] = [
        {
          name: ' testName',
          value: 'testValue',
        },
        {
          name: 'testName ',
          value: 'testValue2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found duplicate tag names: ['testName'], duplicate tag names are not allowed. Found tag names with spaces: [' testName', 'testName '], tag names with spaces are not allowed.`
      );
    });

    it('should not throw an error if provided with valid global data tags', () => {
      const tags: GlobalDataTag[] = [
        {
          name: 'testName',
          value: 'testValue',
        },
        {
          name: 'anotherName',
          value: 'anotherValue',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).not.toThrow();
    });
  });
});
