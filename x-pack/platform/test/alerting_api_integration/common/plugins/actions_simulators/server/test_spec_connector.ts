/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';

export const TestSingleFileConnector: ConnectorSpec = {
  metadata: {
    id: 'test.single_file_connector',
    displayName: 'Test Single File Connector',
    description: 'Functional testing for single file connector registration',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [
      'none',
      'basic',
      {
        type: 'api_key_header',
        defaults: {
          headerField: 'Key',
        },
      },
    ],
    headers: {
      'x-test-header': 'i-am-a-test-header-value',
      'kbn-xsrf': 'foo',
    },
  },

  schema: z.object({
    apiUrl: z.string().describe('API URL'),
  }),

  actions: {
    testHandlerParams: {
      isTool: true,
      input: z.object({
        message: z.string(),
      }),
      handler: async (ctx, input) => {
        // this API should return the data it is passed
        const response = await ctx.client(ctx.config?.apiUrl as string, {
          method: 'get',
          data: { ...(input as Record<string, unknown>), ...ctx.secrets, ...ctx.config },
        });

        return response.data;
      },
    },
    validateAuthentication: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx, input) => {
        const response = await ctx.client(ctx.config?.apiUrl as string, {
          method: 'post',
          data: 'validateAuthentication',
        });

        return response.data;
      },
    },
    validateHeaders: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx, input) => {
        const response = await ctx.client(ctx.config?.apiUrl as string, {
          method: 'post',
          data: 'validateHeaders',
        });

        return response.data;
      },
    },
    validateParams: {
      isTool: true,
      input: z.object({
        foobar: z.string(),
      }),
      handler: async (ctx, input) => {
        return {};
      },
    },
    throwError: {
      isTool: true,
      input: z.object({
        foobar: z.string(),
      }),
      handler: async (ctx, input) => {
        throw new Error('some error message');
      },
    },
  },
};
