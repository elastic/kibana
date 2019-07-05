/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapCustomError } from '../../../lib/error_wrappers';
import { doesClusterExist } from '../../../lib/does_cluster_exist';
import { registerDeleteRoute } from './register_delete_route';

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

describe('[API Routes] Remote Clusters Delete', () => {
  let server;
  let routeHandler;

  beforeEach(() => {
    server = {
      route({ handler }) {
        routeHandler = handler;
      },
    };
  });

  it('should return empty cluster information from Elasticsearch', async () => {
    const mock = {
      "acknowledged": true,
      "persistent": {},
      "transient": {}
    };
    setHttpRequestResponse(null, mock);

    registerDeleteRoute(server);
    const response = await routeHandler({
      params: {
        name: 'test_cluster'
      }
    });

    expect(response).toEqual({});
  });

  it('should return an error if the response does still contain cluster information', async () => {
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

    registerDeleteRoute(server);
    const response = await routeHandler({
      params: {
        name: 'test_cluster'
      }
    });

    expect(response).toEqual(wrapCustomError(new Error('Unable to delete cluster, information still returned from ES.'), 400));
  });

  it('should return an error if the cluster does not exist', async () => {
    doesClusterExist.mockReturnValueOnce(false);
    registerDeleteRoute(server);
    const response = await routeHandler({
      params: {
        name: 'test_cluster'
      }
    });

    expect(response).toEqual(wrapCustomError(new Error('There is no remote cluster with that name.'), 404));
  });

  it('should forward an ES error', async () => {
    const mockError = new Error();
    mockError.response = JSON.stringify({ error: 'Test error' });
    setHttpRequestResponse(mockError);

    registerDeleteRoute(server);
    const response = await routeHandler({
      params: {
        name: 'test_cluster'
      }
    });

    expect(response).toEqual(Boom.boomify(mockError));
  });
});
