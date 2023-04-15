/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { INTERNAL_TAGS_URL, SECURITY_TAG_NAME } from '../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  mockGetCurrentUser,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { getOrCreateSecurityTag } from '../helpers';
import { mockGetTagsResult } from '../__mocks__';
import { getSecuritySolutionTagsRoute } from './get_security_solution_tags';
jest.mock('../helpers', () => ({ getOrCreateSecurityTag: jest.fn() }));

describe('getSecuritySolutionTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  const { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;
  const mockRequest = requestMock.create({
    method: 'get',
    path: INTERNAL_TAGS_URL,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    getSecuritySolutionTagsRoute(server.router, logger, securitySetup);
  });

  it('should return tags with Security Solution tags', async () => {
    (getOrCreateSecurityTag as jest.Mock).mockResolvedValue({
      response: mockGetTagsResult,
    });

    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toMatchInlineSnapshot(`
      Array [
        Object {
          "color": "#4bc922",
          "description": "Security Solution auto-generated tag",
          "id": "de7ad1f0-ccc8-11ed-9175-1b0d4269ff48",
          "name": "Security Solution",
        },
      ]
    `);
  });

  it('should return error', async () => {
    const error = {
      statusCode: 500,
      message: 'Internal Server Error',
    };
    (getOrCreateSecurityTag as jest.Mock).mockResolvedValue({
      response: null,
      error,
    });

    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(error.statusCode);
    expect(response.body.message).toEqual(
      `Failed to create ${SECURITY_TAG_NAME} tag - ${error.message}`
    );
  });
});
