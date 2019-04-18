/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import Hapi from 'hapi';
import Chance from 'chance';

import { createDashboardModeRequestInterceptor } from '../dashboard_mode_request_interceptor';
import * as constantsNS from '../../common/constants';

const chance = new Chance();

function setup() {
  // randomize AUTH_SCOPE_DASHBORD_ONLY_MODE "constant" to ensure it's being used everywhere
  const authScope = chance.word({ length: 12 });
  Object.defineProperty(constantsNS, 'AUTH_SCOPE_DASHBORD_ONLY_MODE', {
    value: authScope,
    configurable: true,
  });

  const dashboardViewerApp = {
    name: 'dashboardViewerApp'
  };

  const server = new Hapi.Server();

  // attach the extension
  server.ext(createDashboardModeRequestInterceptor(dashboardViewerApp));

  // allow the extension to fake "render an app"
  server.decorate('toolkit', 'renderApp', function (app) {
    // `this` is the `h` response toolkit
    return this.response({ renderApp: true, app });
  });

  server.route({
    path: '/app/{appId}',
    method: 'GET',
    handler(req, h) {
      return h.renderApp({ name: req.params.appId });
    }
  });

  // catch all route for determining when we get through the extensions
  server.route({
    path: '/{path*}',
    method: 'GET',
    handler(req) {
      return { catchAll: true, path: `/${req.params.path}` };
    }
  });

  return { server, authScope };
}

describe('DashboardOnlyModeRequestInterceptor', () => {
  describe('basics', () => {
    it('throws if it does not get the `dashboardViewerApp`', () => {
      expect(() => {
        createDashboardModeRequestInterceptor();
      }).to.throwError('dashboardViewerApp');
    });
  });

  describe('request does not have `xpack:dashboardMode` scope', () => {
    describe('app route', () => {
      it('lets the route render as normal', async () => {
        const { server } = setup();
        const response = await server.inject({
          url: '/app/kibana',
          credentials: {
            scope: ['foo', 'bar']
          }
        });

        expect(response)
          .to.have.property('statusCode', 200)
          .and.have.property('result').eql({
            renderApp: true,
            app: { name: 'kibana' }
          });
      });
    });

    describe('non-app route', () => {
      it('lets the route render as normal', async () => {
        const { server } = setup();
        const response = await server.inject({
          url: '/foo/bar',
          credentials: {
            scope: ['foo', 'bar']
          }
        });

        expect(response)
          .to.have.property('statusCode', 200)
          .and.have.property('result').eql({
            catchAll: true,
            path: '/foo/bar'
          });
      });
    });
  });

  describe('request has correct auth scope scope', () => {
    describe('non-kibana app route', () => {
      it('responds with 404', async () => {
        const { server, authScope } = setup();
        const response = await server.inject({
          url: '/app/foo',
          credentials: {
            scope: [authScope]
          }
        });

        expect(response)
          .to.have.property('statusCode', 404);
      });
    });

    function testRendersDashboardViewerApp(url) {
      describe(`requests to url:"${url}"`, () => {
        it('renders the dashboardViewerApp instead', async () => {
          const { server, authScope } = setup();
          const response = await server.inject({
            url: '/app/kibana',
            credentials: {
              scope: [authScope]
            }
          });

          expect(response)
            .to.have.property('statusCode', 200)
            .and.have.property('result').eql({
              renderApp: true,
              app: { name: 'dashboardViewerApp' },
            });
        });
      });
    }

    testRendersDashboardViewerApp('/app/kibana');
    testRendersDashboardViewerApp('/app/kibana#/foo/bar');
    testRendersDashboardViewerApp('/app/kibana/foo/bar');
    testRendersDashboardViewerApp('/app/kibana?foo=bar');
  });
});
