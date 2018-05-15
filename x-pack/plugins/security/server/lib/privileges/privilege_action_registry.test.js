/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerPrivilegesWithCluster } from './privilege_action_registry';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { buildPrivilegeMap } from './privileges';

const defaultVersion = 'default-version';
const defaultApplication = 'default-application';

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));
jest.mock('./privileges', () => ({
  buildPrivilegeMap: jest.fn(),
}));

const registerMockCallWithInternalUser = () => {
  const callWithInternalUser = jest.fn();
  getClient.mockReturnValue({
    callWithInternalUser,
  });
  return callWithInternalUser;
};

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn(),
    }),
    log: jest.fn(),
  };

  const defaultSettings = {
    'pkg.version': defaultVersion,
    'xpack.security.rbac.application': defaultApplication,
  };

  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockServer;
};

test(`passes application and kibanaVersion to buildPrivilegeMap`, async () => {
  const application = 'foo-application';
  const version = 'foo-version';
  const mockServer = createMockServer({
    settings: {
      'pkg.version': version,
      'xpack.security.rbac.application': application,
    },
  });
  registerMockCallWithInternalUser();

  await registerPrivilegesWithCluster(mockServer);

  expect(buildPrivilegeMap).toHaveBeenCalledWith(application, version);
});

test(`updates privileges when existing privileges aren't the expected privileges`, async () => {
  const mockServer = createMockServer();
  const mockCallWithInternalUser = registerMockCallWithInternalUser();
  mockCallWithInternalUser.mockImplementationOnce(async () => ({
    expected: false,
  }));

  const expectedPrivileges = {
    expected: true,
  };
  buildPrivilegeMap.mockReturnValue(expectedPrivileges);
  await registerPrivilegesWithCluster(mockServer);
  expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.getPrivilege', {
    privilege: defaultApplication,
  });
  expect(mockCallWithInternalUser).toHaveBeenCalledWith(
    'shield.postPrivileges',
    {
      body: expectedPrivileges,
    }
  );
});

test(`doesn't update privileges when existing privileges are expected`, async () => {
  const mockServer = createMockServer();
  const mockCallWithInternalUser = registerMockCallWithInternalUser();
  mockCallWithInternalUser.mockImplementationOnce(async () => ({
    expected: true,
  }));

  const expectedPrivileges = {
    expected: true,
  };
  buildPrivilegeMap.mockReturnValue(expectedPrivileges);
  await registerPrivilegesWithCluster(mockServer);
  expect(mockCallWithInternalUser).toHaveBeenLastCalledWith(
    'shield.getPrivilege',
    {
      privilege: defaultApplication,
    }
  );
});
