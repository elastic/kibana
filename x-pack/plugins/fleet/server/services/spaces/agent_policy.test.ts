/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../mocks';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import { updateAgentPolicySpaces } from './agent_policy';
import { isSpaceAwarenessEnabled } from './helpers';

jest.mock('./helpers');
jest.mock('../agent_policy');
jest.mock('../package_policy');

describe('updateAgentPolicySpaces', () => {
  beforeEach(() => {
    jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    jest.mocked(agentPolicyService.get).mockResolvedValue({
      id: 'policy1',
      space_ids: ['default'],
    } as any);
    jest.mocked(packagePolicyService.findAllForAgentPolicy).mockResolvedValue([
      {
        id: 'package-policy-1',
        policy_ids: ['policy1'],
      },
      {
        id: 'package-policy-2',
        policy_ids: ['policy1'],
      },
    ] as any);
    appContextService.start(createAppContextStartContractMock());

    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension())
      .updateObjectsSpaces.mockResolvedValue({ objects: [] });

    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension())
      .find.mockResolvedValue({
        total: 1,
        page: 1,
        per_page: 100,
        saved_objects: [
          {
            id: 'token1',
            attributes: {
              namespaces: ['default'],
            },
          } as any,
        ],
      });
  });

  it('does nothings if agent policy already in correct space', async () => {
    await updateAgentPolicySpaces({
      agentPolicyId: 'policy1',
      currentSpaceId: 'default',
      newSpaceIds: ['default'],
      authorizedSpaces: ['default'],
    });
    expect(
      appContextService.getInternalUserSOClientWithoutSpaceExtension().updateObjectsSpaces
    ).not.toBeCalled();
  });

  it('does nothing if feature flag is not enabled', async () => {
    jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    await updateAgentPolicySpaces({
      agentPolicyId: 'policy1',
      currentSpaceId: 'default',
      newSpaceIds: ['test'],
      authorizedSpaces: ['test', 'default'],
    });

    expect(
      appContextService.getInternalUserSOClientWithoutSpaceExtension().updateObjectsSpaces
    ).not.toBeCalled();
  });

  it('allow to change spaces', async () => {
    await updateAgentPolicySpaces({
      agentPolicyId: 'policy1',
      currentSpaceId: 'default',
      newSpaceIds: ['test'],
      authorizedSpaces: ['test', 'default'],
    });

    expect(
      appContextService.getInternalUserSOClientWithoutSpaceExtension().updateObjectsSpaces
    ).toBeCalledWith(
      [
        { id: 'policy1', type: 'fleet-agent-policies' },
        { id: 'package-policy-1', type: 'fleet-package-policies' },
        { id: 'package-policy-2', type: 'fleet-package-policies' },
      ],
      ['test'],
      ['default'],
      { namespace: 'default', refresh: 'wait_for' }
    );

    expect(
      jest.mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension()).bulkUpdate
    ).toBeCalledWith([
      {
        id: 'token1',
        type: 'fleet-uninstall-tokens',
        attributes: {
          namespaces: ['test'],
        },
      },
    ]);
  });

  it('throw when trying to change space to a policy with reusable package policies', async () => {
    jest.mocked(packagePolicyService.findAllForAgentPolicy).mockResolvedValue([
      {
        id: 'package-policy-1',
        policy_ids: ['policy1'],
      },
      {
        id: 'package-policy-2',
        policy_ids: ['policy1', 'policy2'],
      },
    ] as any);
    await expect(
      updateAgentPolicySpaces({
        agentPolicyId: 'policy1',
        currentSpaceId: 'default',
        newSpaceIds: ['test'],
        authorizedSpaces: ['test', 'default'],
      })
    ).rejects.toThrowError(
      /Agent policies using reusable integration policies cannot be moved to a different space./
    );
  });

  it('throw when trying to change a managed policies space', async () => {
    jest.mocked(agentPolicyService.get).mockResolvedValue({
      id: 'policy1',
      space_ids: ['default'],
      is_managed: true,
    } as any);
    jest.mocked(packagePolicyService.findAllForAgentPolicy).mockResolvedValue([] as any);
    await expect(
      updateAgentPolicySpaces({
        agentPolicyId: 'policy1',
        currentSpaceId: 'default',
        newSpaceIds: ['test'],
        authorizedSpaces: ['test', 'default'],
      })
    ).rejects.toThrowError(/Cannot update hosted agent policy policy1 space/);
  });

  it('throw when trying to add a space with missing permissions', async () => {
    await expect(
      updateAgentPolicySpaces({
        agentPolicyId: 'policy1',
        currentSpaceId: 'default',
        newSpaceIds: ['default', 'test'],
        authorizedSpaces: ['default'],
      })
    ).rejects.toThrowError(/Not enough permissions to create policies in space test/);
  });

  it('throw when trying to remove a space with missing permissions', async () => {
    await expect(
      updateAgentPolicySpaces({
        agentPolicyId: 'policy1',
        currentSpaceId: 'default',
        newSpaceIds: ['test'],
        authorizedSpaces: ['test'],
      })
    ).rejects.toThrowError(/Not enough permissions to remove policies from space default/);
  });
});
