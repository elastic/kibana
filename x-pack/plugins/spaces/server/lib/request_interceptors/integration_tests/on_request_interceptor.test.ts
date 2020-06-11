/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { initSpacesOnRequestInterceptor } from '../on_request_interceptor';
import {
  KibanaRequest,
  KibanaResponseFactory,
  CoreSetup,
  IBasePath,
  IRouter,
} from '../../../../../../../src/core/server';

import * as kbnTestServer from '../../../../../../../src/test_utils/kbn_server';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/mocks';

describe('onRequestInterceptor', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeEach(async () => {
    root = kbnTestServer.createRoot();
  }, 30000);

  afterEach(async () => await root.shutdown());

  function initKbnServer(router: IRouter, basePath: IBasePath) {
    router.get(
      { path: '/np_foo', validate: false },
      (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
        return h.ok({ body: { path: req.url.pathname, basePath: basePath.get(req) } });
      }
    );

    router.get(
      { path: '/some/path/s/np_foo/bar', validate: false },
      (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
        return h.ok({ body: { path: req.url.pathname, basePath: basePath.get(req) } });
      }
    );

    router.get(
      {
        path: '/i/love/np_spaces',
        validate: {
          query: schema.object({
            queryParam: schema.string({
              defaultValue: 'oh noes, this was not set on the request correctly',
            }),
          }),
        },
      },
      (context: unknown, req: KibanaRequest, h: KibanaResponseFactory) => {
        return h.ok({
          body: {
            path: req.url.pathname,
            basePath: basePath.get(req),
            query: req.query,
          },
        });
      }
    );
  }

  interface SetupOpts {
    basePath: string;
  }
  async function setup(opts: SetupOpts = { basePath: '/' }) {
    const { http, elasticsearch } = await root.setup();
    // Mock esNodesCompatibility$ to prevent `root.start()` from blocking on ES version check
    elasticsearch.esNodesCompatibility$ = elasticsearchServiceMock.createInternalSetup().esNodesCompatibility$;

    initSpacesOnRequestInterceptor({
      http: (http as unknown) as CoreSetup['http'],
    });

    const router = http.createRouter('/');

    initKbnServer(router, http.basePath);

    await root.start();

    return {
      http,
    };
  }

  it('handles paths without a space identifier', async () => {
    await setup({ basePath: '/' });

    const path = '/np_foo';

    await kbnTestServer.request.get(root, path).expect(200, {
      path,
      basePath: '', // no base path set for route within the default space
    });
  }, 30000);

  it('strips the Space URL Context from the request', async () => {
    await setup({ basePath: '/' });

    const path = '/s/foo-space/np_foo';

    await kbnTestServer.request.get(root, path).expect(200, {
      path: '/np_foo',
      basePath: '/s/foo-space',
    });
  }, 30000);

  it('ignores space identifiers in the middle of the path', async () => {
    await setup({ basePath: '/' });

    const path = '/some/path/s/np_foo/bar';

    await kbnTestServer.request.get(root, path).expect(200, {
      path: '/some/path/s/np_foo/bar',
      basePath: '', // no base path set for route within the default space
    });
  }, 30000);

  it('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
    await setup({ basePath: '/' });

    const path = '/s/foo/i/love/np_spaces?queryParam=queryValue';

    await kbnTestServer.request.get(root, path).expect(200, {
      path: '/i/love/np_spaces',
      basePath: '/s/foo',
      query: {
        queryParam: 'queryValue',
      },
    });
  }, 30000);
});
