/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetAgentPolicies } from '../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';

import { useSelectFleetServerPolicy } from './use_select_fleet_server_policy';

jest.mock('../../../hooks');

describe('useSelectFleetServerPolicy hook', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Return eligible fleet server policies', async () => {
    jest.mocked(useGetAgentPolicies).mockReturnValue({
      data: {
        items: [
          {
            id: 'test1',
            is_default_fleet_server: true,
            package_policies: [
              {
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
        ],
      },
    } as any);
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useSelectFleetServerPolicy());

    expect(result.current.fleetServerPolicyId).toEqual('test1');
    expect(result.current.eligibleFleetServerPolicies.map(({ id }) => id)).toEqual(['test1']);
  });

  it('Do not return managed fleet server policies', async () => {
    jest.mocked(useGetAgentPolicies).mockReturnValue({
      data: {
        items: [
          {
            id: 'test1',
            is_managed: true,
            is_default_fleet_server: true,
            package_policies: [
              {
                package: {
                  name: 'fleet_server',
                },
              },
            ],
          },
        ],
      },
    } as any);
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useSelectFleetServerPolicy());

    expect(result.current.fleetServerPolicyId).toBeUndefined();
    expect(result.current.eligibleFleetServerPolicies.map(({ id }) => id)).toEqual([]);
  });
});
