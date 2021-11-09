/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreconfiguredOutputsSchema, PreconfiguredAgentPoliciesSchema } from './preconfiguration';

describe('Test preconfiguration schema', () => {
  describe('PreconfiguredOutputsSchema', () => {
    it('should not allow multiple default output', () => {
      expect(() => {
        PreconfiguredOutputsSchema.validate([
          {
            id: 'output-1',
            name: 'Output 1',
            type: 'elasticsearch',
            is_default: true,
          },
          {
            id: 'output-2',
            name: 'Output 2',
            type: 'elasticsearch',
            is_default: true,
          },
        ]);
      }).toThrowError('preconfigured outputs need to have only one default output.');
    });
    it('should not allow multiple output with same ids', () => {
      expect(() => {
        PreconfiguredOutputsSchema.validate([
          {
            id: 'nonuniqueid',
            name: 'Output 1',
            type: 'elasticsearch',
          },
          {
            id: 'nonuniqueid',
            name: 'Output 2',
            type: 'elasticsearch',
          },
        ]);
      }).toThrowError('preconfigured outputs need to have unique ids.');
    });
    it('should not allow multiple output with same names', () => {
      expect(() => {
        PreconfiguredOutputsSchema.validate([
          {
            id: 'output-1',
            name: 'nonuniquename',
            type: 'elasticsearch',
          },
          {
            id: 'output-2',
            name: 'nonuniquename',
            type: 'elasticsearch',
          },
        ]);
      }).toThrowError('preconfigured outputs need to have unique names.');
    });
  });

  describe('PreconfiguredAgentPoliciesSchema', () => {
    it('should not allow multiple outputs in one policy', () => {
      expect(() => {
        PreconfiguredAgentPoliciesSchema.validate([
          {
            id: 'policy-1',
            name: 'Policy 1',
            package_policies: [],
            data_output_id: 'test1',
            monitoring_output_id: 'test2',
          },
        ]);
      }).toThrowError(
        '[0]: Currently Fleet only support one output per agent policy data_output_id should be the same as monitoring_output_id.'
      );
    });
  });
});
