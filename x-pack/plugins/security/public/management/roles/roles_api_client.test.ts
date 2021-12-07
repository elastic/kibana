/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from 'src/core/public/mocks';

import type { Role } from '../../../common/model';
import { RolesAPIClient } from './roles_api_client';

describe('RolesAPIClient', () => {
  async function saveRole(role: Role) {
    const httpMock = httpServiceMock.createStartContract();
    const rolesAPIClient = new RolesAPIClient(httpMock);

    await rolesAPIClient.saveRole({ role });
    expect(httpMock.put).toHaveBeenCalledTimes(1);

    return JSON.parse((httpMock.put.mock.calls[0] as any)[1]?.body as any);
  }

  it('removes placeholder index privileges', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [{ names: [], privileges: [] }],
        run_as: [],
      },
      kibana: [],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    });
  });

  it('removes placeholder query entries', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['.kibana*'], privileges: ['all'], query: '' }],
        run_as: [],
      },
      kibana: [],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['.kibana*'], privileges: ['all'] }],
        run_as: [],
      },
      kibana: [],
    });
  });

  it('removes transient fields not required for save', async () => {
    const role: Role = {
      name: 'my role',
      transient_metadata: {
        foo: 'bar',
      },
      _transform_error: ['kibana'],
      metadata: {
        someOtherMetadata: true,
      },
      _unrecognized_applications: ['foo'],
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      metadata: {
        someOtherMetadata: true,
      },
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    });
  });

  it('does not remove actual query entries', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
        run_as: [],
      },
      kibana: [],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [{ names: ['.kibana*'], privileges: ['all'], query: 'something' }],
        run_as: [],
      },
      kibana: [],
    });
  });

  it('should remove feature privileges if a corresponding base privilege is defined', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['foo'],
          base: ['all'],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
      ],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['foo'],
          base: ['all'],
          feature: {},
        },
      ],
    });
  });

  it('should not remove feature privileges if a corresponding base privilege is not defined', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['foo'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
      ],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['foo'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
      ],
    });
  });

  it('should not remove space privileges', async () => {
    const role: Role = {
      name: 'my role',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
        {
          spaces: ['marketing'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
      ],
    };

    const result = await saveRole(role);

    expect(result).toEqual({
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
        {
          spaces: ['marketing'],
          base: [],
          feature: {
            feature1: ['read'],
            feature2: ['write'],
          },
        },
      ],
    });
  });
});
