/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import sinon from 'sinon';

import { xpackInfoRoute } from '../xpack_info';

describe('XPackInfo routes', () => {
  let serverStub;
  let replyStub;
  beforeEach(() => {
    serverStub = {
      route: sinon.stub(),
      plugins: {
        xpack_main: {
          info: sinon.stub({ isAvailable() {}, toJSON() {} })
        }
      }
    };

    replyStub = sinon.stub();

    xpackInfoRoute(serverStub);
  });

  it('correctly initialize XPack Info route.', () => {
    sinon.assert.calledWithExactly(serverStub.route, {
      method: 'GET',
      path: '/api/xpack/v1/info',
      handler: sinon.match.func
    });
  });

  it('replies with `Not Found` Boom error if `xpackInfo` is not available.', () => {
    serverStub.plugins.xpack_main.info.isAvailable.returns(false);

    const onRouteHandler = serverStub.route.firstCall.args[0].handler;
    onRouteHandler({}, replyStub);

    sinon.assert.calledWithExactly(
      replyStub,
      Boom.notFound()
    );
  });

  it('replies with pre-processed `xpackInfo` if it is available.', () => {
    serverStub.plugins.xpack_main.info.isAvailable.returns(true);
    serverStub.plugins.xpack_main.info.toJSON.returns({
      license: {
        type: 'gold',
        isActive: true,
        expiryDateInMillis: 1509368280381
      },
      features: {
        security: {
          showLogin: true,
          allowLogin: true,
          showLinks: false,
          allowRoleDocumentLevelSecurity: false,
          allowRoleFieldLevelSecurity: false,
          linksMessage: 'Message'
        }
      }
    });

    const onRouteHandler = serverStub.route.firstCall.args[0].handler;
    onRouteHandler({}, replyStub);

    sinon.assert.calledWithExactly(
      replyStub,
      {
        license: {
          type: 'gold',
          is_active: true,
          expiry_date_in_millis: 1509368280381
        },
        features: {
          security: {
            show_login: true,
            allow_login: true,
            show_links: false,
            allow_role_document_level_security: false,
            allow_role_field_level_security: false,
            links_message: 'Message'
          }
        }
      }
    );
  });
});
