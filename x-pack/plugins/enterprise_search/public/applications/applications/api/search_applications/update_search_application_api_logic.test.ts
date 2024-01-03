/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { updateSearchApplication } from './update_search_application_api_logic';

describe('UpdateSearchApplicationApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateSearchApplication', () => {
    it('calls correct api', async () => {
      const searchApplication = {
        name: 'my-search-application',
        indices: ['an-index'],
        template: {
          script: {
            source: '"query":{"term":{"{{field_name}}":["{{field_value}}"',
            lang: 'mustache',
            options: {
              content_type: 'application/json;charset=utf-8',
            },
            params: {
              field_name: 'hello',
              field_value: 'world',
            },
          },
        },
      };
      const response = { result: 'updated' };
      const promise = Promise.resolve(response);
      http.put.mockReturnValue(promise);
      const result = updateSearchApplication(searchApplication);
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/enterprise_search/search_applications/my-search-application',
        {
          body:
            '{"indices":["an-index"],' +
            '"name":"my-search-application",' +
            '"template":{' +
            '"script":{"source":"\\"query\\":{\\"term\\":{\\"{{field_name}}\\":[\\"{{field_value}}\\"",' +
            '"lang":"mustache",' +
            '"options":{"content_type":"application/json;charset=utf-8"},' +
            '"params":{"field_name":"hello","field_value":"world"}}}}',
        }
      );
      await expect(result).resolves.toEqual(response);
    });
  });
});
