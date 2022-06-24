/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreconfiguredOutputsSchema } from './preconfiguration';

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
            hosts: ['http://test.fr:9200'],
          },
          {
            id: 'output-2',
            name: 'Output 2',
            type: 'elasticsearch',
            is_default: true,
            hosts: ['http://test.fr:9200'],
          },
        ]);
      }).toThrowError('preconfigured outputs can only have one default output.');
    });
    it('should not allow multiple default monitoring output', () => {
      expect(() => {
        PreconfiguredOutputsSchema.validate([
          {
            id: 'output-1',
            name: 'Output 1',
            type: 'elasticsearch',
            is_default_monitoring: true,
            hosts: ['http://test.fr:9200'],
          },
          {
            id: 'output-2',
            name: 'Output 2',
            type: 'elasticsearch',
            is_default_monitoring: true,
            hosts: ['http://test.fr:9200'],
          },
        ]);
      }).toThrowError('preconfigured outputs can only have one default monitoring output.');
    });
    it('should not allow multiple output with same ids', () => {
      expect(() => {
        PreconfiguredOutputsSchema.validate([
          {
            id: 'nonuniqueid',
            name: 'Output 1',
            type: 'elasticsearch',
            hosts: ['http://test.fr:9200'],
          },
          {
            id: 'nonuniqueid',
            name: 'Output 2',
            type: 'elasticsearch',
            hosts: ['http://test.fr:9200'],
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
            hosts: ['http://test.fr:9200'],
          },
          {
            id: 'output-2',
            name: 'nonuniquename',
            type: 'elasticsearch',
            hosts: ['http://test.fr:9200'],
          },
        ]);
      }).toThrowError('preconfigured outputs need to have unique names.');
    });
  });
});
