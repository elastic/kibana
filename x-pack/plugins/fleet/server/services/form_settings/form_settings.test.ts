/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { schema } from '@kbn/config-schema';

import type { SettingsConfig } from '../../../common/settings/types';

import { _getSettingsAPISchema, _getSettingsValuesForAgentPolicy } from './form_settings';

const TEST_SETTINGS: SettingsConfig[] = [
  {
    name: 'test.foo',
    title: 'test',
    description: 'test',
    schema: z.boolean(),
    api_field: {
      name: 'test_foo',
    },
  },
  {
    name: 'test.foo.default_value',
    title: 'test',
    description: 'test',
    schema: z.string().default('test'),
    api_field: {
      name: 'test_foo_default_value',
    },
  },
];

describe('form_settings', () => {
  describe('_getSettingsAPISchema', () => {
    it('generate a valid API schema for api_field', () => {
      const apiSchema = schema.object(_getSettingsAPISchema(TEST_SETTINGS));

      expect(() =>
        apiSchema.validate({
          test_foo: 'not valid',
        })
      ).toThrowError(/Expected boolean, received string/);

      expect(() =>
        apiSchema.validate({
          test_foo: true,
        })
      ).not.toThrow();
    });

    it('generate a valid API schema for api_field with default value', () => {
      const apiSchema = schema.object(_getSettingsAPISchema(TEST_SETTINGS));
      const res = apiSchema.validate({});
      expect(res).toEqual({ test_foo_default_value: 'test' });
    });
  });

  describe('_getSettingsValuesForAgentPolicy', () => {
    it('generate the proper values for agent policy (full agent policy)', () => {
      const res = _getSettingsValuesForAgentPolicy(TEST_SETTINGS, {
        test_foo_default_value: 'test',
      } as any);
      expect(res).toEqual({ 'test.foo.default_value': 'test' });
    });
  });
});
