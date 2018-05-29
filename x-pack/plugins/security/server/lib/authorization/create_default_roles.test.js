/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createDefaultRoles } from './create_default_roles';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn()
}));

const mockShieldClient = () => {
  const mockCallWithInternalUser = jest.fn();
  getClient.mockReturnValue({
    callWithInternalUser: mockCallWithInternalUser
  });

  return {
    mockCallWithInternalUser
  };
};

const defaultApplication = 'foo-application';

const createMockServer = ({ settings = {} } = {}) => {
  const mockServer = {
    config: jest.fn().mockReturnValue({
      get: jest.fn()
    })
  };

  const defaultSettings = {
    'xpack.security.rbac.createDefaultRoles': true,
    'xpack.security.rbac.application': defaultApplication
  };

  mockServer.config().get.mockImplementation(key => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return mockServer;
};

test(`doesn't create roles if createDefaultRoles is false`, async () => {
  const { mockCallWithInternalUser } = mockShieldClient();
  const mockServer = createMockServer({
    settings: {
      'xpack.security.rbac.createDefaultRoles': false
    }
  });

  await createDefaultRoles(mockServer);

  expect(mockCallWithInternalUser).toHaveBeenCalledTimes(0);
});

describe(`rbac_user`, () => {
  test(`doesn't create \${application}_rbac_user when it exists`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockReturnValue(null);

    await createDefaultRoles(mockServer);

    expect(mockCallWithInternalUser).not.toHaveBeenCalledWith('shield.putRole', expect.anything());
  });

  test(`creates \${application}_rbac_user when it doesn't exist`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_user`) {
        throw {
          statusCode: 404
        };
      }

      return null;
    });

    await createDefaultRoles(mockServer);

    expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.putRole', {
      name: `${defaultApplication}_rbac_user`,
      body: {
        cluster: [],
        index: [],
        applications: [
          {
            application: defaultApplication,
            privileges: [ 'all' ],
            resources: [ DEFAULT_RESOURCE ]
          }
        ]
      }
    });
  });

  test(`throws error when sheild.getRole throws non 404 error`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_user`) {
        throw {
          statusCode: 500
        };
      }

      return null;
    });

    expect(createDefaultRoles(mockServer)).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`throws error when shield.putRole throws error`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_user`) {
        throw {
          statusCode: 404
        };
      }

      if (endpoint === 'shield.putRole' && params.name === `${defaultApplication}_rbac_user`) {
        throw new Error('Some other error');
      }

      return null;
    });

    await expect(createDefaultRoles(mockServer)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe(`dashboard_only_user`, () => {
  test(`doesn't create \${application}_rbac_dashboard_only_user when it exists`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockReturnValue(null);

    await createDefaultRoles(mockServer);

    expect(mockCallWithInternalUser).not.toHaveBeenCalledWith('shield.putRole', expect.anything());
  });

  test(`creates \${application}_rbac_dashboard_only_user when it doesn't exist`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_dashboard_only_user`) {
        throw {
          statusCode: 404
        };
      }

      return null;
    });

    await createDefaultRoles(mockServer);

    expect(mockCallWithInternalUser).toHaveBeenCalledWith('shield.putRole', {
      name: `${defaultApplication}_rbac_dashboard_only_user`,
      body: {
        cluster: [],
        index: [],
        applications: [
          {
            application: defaultApplication,
            privileges: [ 'read' ],
            resources: [ DEFAULT_RESOURCE ]
          }
        ]
      }
    });
  });

  test(`throws error when shield.getRole throws non 404 error`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_dashboard_only_user`) {
        throw {
          statusCode: 500
        };
      }

      return null;
    });

    await expect(createDefaultRoles(mockServer)).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`throws error when shield.putRole throws error`, async () => {
    const { mockCallWithInternalUser } = mockShieldClient();
    const mockServer = createMockServer();
    mockCallWithInternalUser.mockImplementation(async (endpoint, params) => {
      if (endpoint === 'shield.getRole' && params.name === `${defaultApplication}_rbac_dashboard_only_user`) {
        throw {
          statusCode: 404
        };
      }

      if (endpoint === 'shield.putRole' && params.name === `${defaultApplication}_rbac_dashboard_only_user`) {
        throw new Error('Some other error');
      }

      return null;
    });

    await expect(createDefaultRoles(mockServer)).rejects.toThrowErrorMatchingSnapshot();
  });
});
