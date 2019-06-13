/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RESERVED_PRIVILEGES_APPLICATION_WILDCARD } from '../../../common/constants';
import { getPrivilegesWithRequestFactory } from './get_privileges_with_request';
import { Legacy } from 'kibana';
import { EsApplication } from './types';

const application = 'kibana-our_application';

const createMockShieldClient = (response: any) => {
  const mockCallWithRequest = jest.fn();

  mockCallWithRequest.mockImplementationOnce(async () => response);

  return {
    callWithRequest: mockCallWithRequest,
  };
};

describe('#getPrivilegesWithRequest', () => {
  const getPrivilegesWithRequestTest = (
    description: string,
    options: {
      esPrivilegesResponse: { applications: EsApplication[] };
      expectedResult?: any;
      expectErrorThrown?: any;
    }
  ) => {
    test(description, async () => {
      const mockShieldClient = createMockShieldClient(options.esPrivilegesResponse);

      const getPrivilegesWithRequest = getPrivilegesWithRequestFactory(
        application,
        mockShieldClient
      );
      const request = { foo: Symbol() };

      let actualResult;
      let errorThrown = null;
      try {
        actualResult = await getPrivilegesWithRequest((request as unknown) as Legacy.Request);
      } catch (err) {
        errorThrown = err;
      }

      expect(mockShieldClient.callWithRequest).toHaveBeenCalledWith(
        request,
        'shield.userPrivileges'
      );

      if (options.expectedResult) {
        expect(errorThrown).toBeNull();
        expect(actualResult).toEqual(options.expectedResult);
      }
    });
  };

  getPrivilegesWithRequestTest('returns ES Applications for this kibana instance', {
    esPrivilegesResponse: {
      applications: [
        {
          application,
          privileges: ['all', 'read'],
          resources: ['*'],
        },
      ],
    },
    expectedResult: [
      {
        application,
        privileges: ['all', 'read'],
        resources: ['*'],
      },
    ],
  });

  getPrivilegesWithRequestTest('inclues ES Applications for the reserved privileges wildcard', {
    esPrivilegesResponse: {
      applications: [
        {
          application,
          privileges: ['all', 'read'],
          resources: ['*'],
        },
        {
          application: RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
          privileges: ['reserved_foo'],
          resources: ['*'],
        },
      ],
    },
    expectedResult: [
      {
        application,
        privileges: ['all', 'read'],
        resources: ['*'],
      },
      {
        application: RESERVED_PRIVILEGES_APPLICATION_WILDCARD,
        privileges: ['reserved_foo'],
        resources: ['*'],
      },
    ],
  });

  getPrivilegesWithRequestTest('excludes unknown ES Applications', {
    esPrivilegesResponse: {
      applications: [
        {
          application,
          privileges: ['all', 'read'],
          resources: ['*'],
        },
        {
          application: 'kibana-.unknownApp',
          privileges: ['reserved_foo'],
          resources: ['*'],
        },
      ],
    },
    expectedResult: [
      {
        application,
        privileges: ['all', 'read'],
        resources: ['*'],
      },
    ],
  });
});
