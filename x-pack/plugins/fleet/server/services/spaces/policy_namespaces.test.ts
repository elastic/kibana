/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { appContextService } from '../app_context';

import { validatePolicyNamespaceForSpace } from './policy_namespaces';

jest.mock('../app_context');

describe('validatePolicyNamespaceForSpace', () => {
  function createSavedsClientMock(settingsAttributes?: any) {
    const client = savedObjectsClientMock.create();

    if (settingsAttributes) {
      client.get.mockResolvedValue({
        attributes: settingsAttributes,
      } as any);
    } else {
      client.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('Not found')
      );
    }

    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(client);

    return client;
  }

  beforeEach(() => {
    jest
      .mocked(appContextService.getExperimentalFeatures)
      .mockReturnValue({ useSpaceAwareness: true } as any);
  });

  it('should retrieve settings based on given spaceId', async () => {
    const soClient = createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'test',
    });

    expect(soClient.get).toBeCalledWith('fleet-space-settings', 'test1-default-settings');
  });

  it('should retrieve default space settings based if no spaceId is provided', async () => {
    const soClient = createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      namespace: 'test',
    });

    expect(soClient.get).toBeCalledWith('fleet-space-settings', 'default-default-settings');
  });

  it('should accept valid namespace if there is some allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock({
      allowed_namespace_prefixes: ['tata', 'test', 'toto'],
    });
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'test',
    });
  });

  it('should accept valid namespace matching prefix if there is some allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock({
      allowed_namespace_prefixes: ['tata', 'test', 'toto'],
    });
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should accept any namespace if there is no settings configured', async () => {
    createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should accept any namespace if there is no allowed_namespace_prefixes configured', async () => {
    createSavedsClientMock();
    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'testvalid',
    });
  });

  it('should throw if the namespace is not matching allowed_namespace_prefixes', async () => {
    createSavedsClientMock({ allowed_namespace_prefixes: ['tata', 'test', 'toto'] });
    await expect(
      validatePolicyNamespaceForSpace({
        spaceId: 'test1',
        namespace: 'notvalid',
      })
    ).rejects.toThrowError(/Invalid namespace, supported namespace prefixes: tata, test, toto/);
  });

  it('should not validate if feature flag is off', async () => {
    jest
      .mocked(appContextService.getExperimentalFeatures)
      .mockReturnValue({ useSpaceAwareness: false } as any);
    createSavedsClientMock({ allowed_namespace_prefixes: ['tata', 'test', 'toto'] });

    await validatePolicyNamespaceForSpace({
      spaceId: 'test1',
      namespace: 'notvalid',
    });
  });
});
