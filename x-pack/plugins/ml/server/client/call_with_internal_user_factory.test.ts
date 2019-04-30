/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithInternalUserFactory } from './call_with_internal_user_factory';

describe('call_with_internal_user_factory', () => {
  describe('callWithInternalUserFactory', () => {
    let server: any;
    let callWithInternalUser: any;

    beforeEach(() => {
      callWithInternalUser = jest.fn();
      server = {
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser })),
          },
        },
      };
    });

    it('should use internal user "admin"', () => {
      const callWithInternalUserInstance = callWithInternalUserFactory(server);
      callWithInternalUserInstance();

      expect(server.plugins.elasticsearch.getCluster).toHaveBeenCalledWith('admin');
    });
  });
});
