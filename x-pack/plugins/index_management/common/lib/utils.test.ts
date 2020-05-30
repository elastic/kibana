/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TemplateV1Serialized, TemplateV2Serialized } from '../types';
import { getTemplateVersion } from './utils';

describe('utils', () => {
  describe('getTemplateVersion', () => {
    test('should detect v1 template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        mappings: {
          properties: {},
        },
      };
      expect(getTemplateVersion(template as TemplateV1Serialized)).toBe(1);
    });

    test('should detect v2 template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        template: {
          mappings: {
            properties: {},
          },
        },
      };
      expect(getTemplateVersion(template as TemplateV2Serialized)).toBe(2);
    });
  });
});
