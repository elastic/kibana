/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { DisplayType, FieldType } from '../lib/dynamic_config/types';
import { getTaskTypes } from './get_task_types';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe.skip('getTaskTypes', () => {
  test('should call get inference task types api', async () => {
    const apiResponse = {
      amazonbedrock: [
        {
          task_type: 'completion',
          configuration: {
            max_new_tokens: {
              display: DisplayType.NUMERIC,
              label: 'Max new tokens',
              order: 1,
              required: false,
              sensitive: false,
              tooltip: 'Sets the maximum number for the output tokens to be generated.',
              type: FieldType.INTEGER,
              validations: [],
              value: null,
              ui_restrictions: [],
              default_value: null,
              depends_on: [],
            },
          },
        },
        {
          task_type: 'text_embedding',
          configuration: {},
        },
      ],
    };
    http.get.mockResolvedValueOnce(apiResponse);

    const result = await getTaskTypes(http, 'amazonbedrock');
    expect(result).toEqual(apiResponse);
  });
});
