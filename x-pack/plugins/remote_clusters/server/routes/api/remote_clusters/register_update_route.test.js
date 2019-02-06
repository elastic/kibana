/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapCustomError } from '../../../lib/error_wrappers';
import { doesClusterExist } from '../../../lib/does_cluster_exist';
import { registerUpdateRoute } from './register_update_route';

jest.mock('../../../lib/call_with_request_factory', () => ({ callWithRequestFactory: jest.fn() }));
jest.mock('../../../lib/is_es_error_factory', () => ({ isEsErrorFactory: () => () => true }));
jest.mock('../../../lib/license_pre_routing_factory', () => ({ licensePreRoutingFactory: () => null }));
jest.mock('../../../lib/does_cluster_exist', () => ({ doesClusterExist: jest.fn().mockReturnValue(true) }));

const setHttpRequestResponse = (err, response) => {
  if (err) {
    return callWithRequestFactory.mockReturnValueOnce(() => {
      throw err;
    });
  }

  callWithRequestFactory.mockReturnValueOnce(() => response);
};

describe('[API Routes] Remote Clusters Update', () => {
  let server;
  let routeHandler;

  beforeEach(() => {
    server = {
      route({ handler }) {
        routeHandler = handler;
      },
    };
  });

  it('should return the cluster information from Elasticsearch', async () => {
    const mock = {
      "acknowledged": true,
      "persistent": {
        "cluster": {
          "remote": {
            "test_cluster": {
              "seeds": []
            }
          }
        }
      },
      "transient": {}
    };
    setHttpRequestResponse(null, mock);

    registerUpdateRoute(server);
    const response = await routeHandler({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      }
    });

    expect(response).toEqual({
      name: 'test_cluster',
      seeds: [],
      isConfiguredByNode: false,
    });
  });

  it('should return an error if the response does not contain cluster information', async () => {
    const mock = {
      "acknowledged": true,
      "persistent": {},
      "transient": {}
    };
    setHttpRequestResponse(null, mock);

    registerUpdateRoute(server);
    const response = await routeHandler({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      }
    });

    expect(response).toEqual(wrapCustomError(new Error('Unable to update cluster, no response returned from ES.'), 400));
  });

  it('should return an error if the cluster does not exist', async () => {
    doesClusterExist.mockReturnValueOnce(false);
    registerUpdateRoute(server);
    const response = await routeHandler({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      }
    });

    expect(response).toEqual(wrapCustomError(new Error('There is no remote cluster with that name.'), 404));
  });

  it('should forward an ES error', async () => {
    const mockError = new Error();
    mockError.response = JSON.stringify({ error: 'Test error' });
    setHttpRequestResponse(mockError);

    registerUpdateRoute(server);
    const response = await routeHandler({
      payload: {
        seeds: [],
      },
      params: {
        name: 'test_cluster',
      }
    });

    expect(response).toEqual(Boom.boomify(mockError));
  });
});
