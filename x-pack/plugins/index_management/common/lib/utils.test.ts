/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyTemplateSerialized, TemplateSerialized } from '../types';
import { isLegacyTemplate } from './utils';

describe('utils', () => {
  describe('isLegacyTemplate', () => {
    test('should detect legacy template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        mappings: {
          properties: {},
        },
      };
      expect(isLegacyTemplate(template as LegacyTemplateSerialized)).toBe(true);
    });

    test('should detect composable template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        template: {
          mappings: {
            properties: {},
          },
        },
      };
      expect(isLegacyTemplate(template as TemplateSerialized)).toBe(false);
    });
  });
});
