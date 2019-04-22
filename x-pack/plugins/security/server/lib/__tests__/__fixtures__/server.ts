/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stub } from 'sinon';

export function serverFixture() {
  return {
    config: stub(),
    register: stub(),
    expose: stub(),
    log: stub(),
    route: stub(),
    decorate: stub(),

    info: {
      protocol: 'protocol',
    },

    auth: {
      strategy: stub(),
      test: stub(),
    },

    plugins: {
      elasticsearch: {
        createCluster: stub(),
      },

      kibana: {
        systemApi: { isSystemApiRequest: stub() },
      },

      security: {
        getUser: stub(),
        authenticate: stub(),
        deauthenticate: stub(),
      },

      xpack_main: {
        info: {
          isAvailable: stub(),
          feature: stub(),
          license: {
            isOneOf: stub(),
          },
        },
      },
    },
  };
}
