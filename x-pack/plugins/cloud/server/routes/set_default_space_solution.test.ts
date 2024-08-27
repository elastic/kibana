/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kibanaResponseFactory,
  RequestHandlerContext,
  RouteValidatorConfig,
} from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { ISpacesClient, SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { setDefaultSpaceSolutionType } from './set_default_space_solution';

const mockRouteContext = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'valid',
      }),
    },
  },
} as unknown as RequestHandlerContext;

const mockRouteContextWithInvalidLicense = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'invalid',
        message: 'License is invalid for spaces',
      }),
    },
  },
} as unknown as RequestHandlerContext;

const mockDefaultSpace = {
  id: 'default',
  attributes: {
    name: 'Default Space',
    disabledFeatures: [],
    _reserved: true,
  },
};

const createMockSpaceClient = () => {
  const mockSpaceClient = {
    get: jest.fn(() => {
      return mockDefaultSpace;
    }),
    update: jest.fn(() => {
      return mockDefaultSpace;
    }),
  } as unknown as jest.Mocked<ISpacesClient>;

  return mockSpaceClient;
};

const createMockSpaceService = (spaceClient: ISpacesClient) => {
  const mockSpaceService = {
    createSpacesClient: jest.fn(() => spaceClient),
  } as unknown as jest.Mocked<SpacesPluginStart['spacesService']>;

  return jest.fn().mockResolvedValue(mockSpaceService);
};

describe('PUT /internal/cloud/solution', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const spacesClientMock = createMockSpaceClient();
    const spacesServiceMock = createMockSpaceService(spacesClientMock);

    setDefaultSpaceSolutionType({
      router,
      getSpacesService: spacesServiceMock,
    });

    const [routeDefinition, routeHandler] =
      router.versioned.put.mock.results[0].value.addVersion.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      spacesClientMock,
    };
  };

  it('should update the solution of the default space', async () => {
    const payload = {
      type: 'observability',
    };

    const { routeHandler, spacesClientMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'put',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(spacesClientMock.get).toHaveBeenCalledTimes(1);
    expect(spacesClientMock.update).toHaveBeenCalledWith('default', {
      ...mockDefaultSpace,
      solution: 'oblt',
    });
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
    });

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });
});
