/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { getInferenceServicesRoute } from './get_inference_services';
import { DisplayType, FieldType } from '../../common/dynamic_config/types';

describe('getInferenceServicesRoute', () => {
  it('returns available service providers', async () => {
    const router = httpServiceMock.createRouter();
    const core = coreMock.createRequestHandlerContext();

    const mockResult = [
      {
        provider: 'openai',
        task_types: [
          {
            task_type: 'completion',
            configuration: {
              user: {
                display: DisplayType.TEXTBOX,
                label: 'User',
                order: 1,
                required: false,
                sensitive: false,
                tooltip: 'Specifies the user issuing the request.',
                type: FieldType.STRING,
                validations: [],
                value: '',
                ui_restrictions: [],
                default_value: null,
                depends_on: [],
              },
            },
          },
        ],
        configuration: {
          api_key: {
            display: DisplayType.TEXTBOX,
            label: 'API Key',
            order: 3,
            required: true,
            sensitive: true,
            tooltip: `The OpenAI API authentication key. For more details about generating OpenAI API keys, refer to the https://platform.openai.com/account/api-keys.`,
            type: FieldType.STRING,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          model_id: {
            display: DisplayType.TEXTBOX,
            label: 'Model ID',
            order: 2,
            required: true,
            sensitive: false,
            tooltip: 'The name of the model to use for the inference task.',
            type: FieldType.STRING,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          organization_id: {
            display: DisplayType.TEXTBOX,
            label: 'Organization ID',
            order: 4,
            required: false,
            sensitive: false,
            tooltip: 'The unique identifier of your organization.',
            type: FieldType.STRING,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
          url: {
            display: DisplayType.TEXTBOX,
            label: 'URL',
            order: 1,
            required: true,
            sensitive: false,
            tooltip:
              'The OpenAI API endpoint URL. For more information on the URL, refer to the https://platform.openai.com/docs/api-reference.',
            type: FieldType.STRING,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: 'https://api.openai.com/v1/chat/completions',
            depends_on: [],
          },
          'rate_limit.requests_per_minute': {
            display: DisplayType.NUMERIC,
            label: 'Rate limit',
            order: 5,
            required: false,
            sensitive: false,
            tooltip:
              'Default number of requests allowed per minute. For text_embedding is 3000. For completion is 500.',
            type: FieldType.INTEGER,
            validations: [],
            value: null,
            ui_restrictions: [],
            default_value: null,
            depends_on: [],
          },
        },
      },
    ];
    core.elasticsearch.client.asInternalUser.transport.request.mockResolvedValue(mockResult);

    getInferenceServicesRoute(router);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/internal/stack_connectors/_inference/_services"`);

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler({ core }, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: mockResult,
    });
  });
});
