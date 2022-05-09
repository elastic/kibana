/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  IBasePath,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import * as kbnTestServer from '@kbn/core/test_helpers/kbn_server';

import { initSpacesOnRequestInterceptor } from './on_request_interceptor';

// FAILING: https://github.com/elastic/kibana/issues/58942
describe.skip('onRequestInterceptor', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  /**
   *
   * commented out due to hooks being called regardless of skip
   * https://github.com/facebook/jest/issues/8379

   beforeEach(async () => {
    root = kbnTestServer.createRoot();
  }, 30000);

   afterEach(async () => await root.shutdown());

   */

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
    routes: 'legacy' | 'new-platform';
  }

  async function setup(opts: SetupOpts = { basePath: '/', routes: 'legacy' }) {
    await root.preboot();
    const { http, elasticsearch } = await root.setup();
    // Mock esNodesCompatibility$ to prevent `root.start()` from blocking on ES version check
    elasticsearch.esNodesCompatibility$ =
      elasticsearchServiceMock.createInternalSetup().esNodesCompatibility$;

    initSpacesOnRequestInterceptor({
      http: http as unknown as CoreSetup['http'],
    });

    const router = http.createRouter('/');

    initKbnServer(router, http.basePath);

    await root.start();

    return {
      http,
    };
  }

  describe('requests handled completely in the new platform', () => {
    it('handles paths without a space identifier', async () => {
      await setup({ basePath: '/', routes: 'new-platform' });

      const path = '/np_foo';

      await kbnTestServer.request.get(root, path).expect(200, {
        path,
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request', async () => {
      await setup({ basePath: '/', routes: 'new-platform' });

      const path = '/s/foo-space/np_foo';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/np_foo',
        basePath: '/s/foo-space',
      });
    }, 30000);

    it('ignores space identifiers in the middle of the path', async () => {
      await setup({ basePath: '/', routes: 'new-platform' });

      const path = '/some/path/s/np_foo/bar';

      await kbnTestServer.request.get(root, path).expect(200, {
        path: '/some/path/s/np_foo/bar',
        basePath: '', // no base path set for route within the default space
      });
    }, 30000);

    it('strips the Space URL Context from the request, maintaining the rest of the path', async () => {
      await setup({ basePath: '/', routes: 'new-platform' });

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
});
