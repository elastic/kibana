/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TemplateV1, TemplateV2 } from '../../common';
import { getTemplateVersion } from './utils';

describe('utils', () => {
  describe('getTemplateVersion', () => {
    test('should detect v1 template', () => {
      const template = {
        indexPatterns: ['logs*'],
        mappings: {
          properties: {},
        },
      };
      expect(getTemplateVersion(template as TemplateV1)).toBe(1);
    });

    test('should detect v2 template', () => {
      const template = {
        indexPatterns: ['logs*'],
        template: {
          mappings: {
            properties: {},
          },
        },
      };
      expect(getTemplateVersion(template as TemplateV2)).toBe(2);
    });
  });
});
