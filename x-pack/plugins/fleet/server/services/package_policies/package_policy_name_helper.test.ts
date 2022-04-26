/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { packagePolicyService } from '../package_policy';

import { incrementPackageName, incrementPackagePolicyCopyName } from './package_policy_name_helper';

describe('Package policy name helper', () => {
  describe('increment package name', () => {
    it('should return 1 if no existing policies', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue(undefined);
      const newName = await incrementPackageName(savedObjectsClientMock.create(), 'apache');
      expect(newName).toEqual('apache-1');
    });

    it('should return 11 if max policy name is 10', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue({
        items: [
          { name: 'apache-1' },
          { name: 'aws-11' },
          { name: 'apache-10' },
          { name: 'apache-9' },
        ],
      });
      const newName = await incrementPackageName(savedObjectsClientMock.create(), 'apache');
      expect(newName).toEqual('apache-11');
    });
  });

  describe('increment package policy copy name', () => {
    it('should return packagePolicyName (copy) if no existing policies', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue({ items: [] });
      const newName = await incrementPackagePolicyCopyName(
        savedObjectsClientMock.create(),
        'packagePolicyName'
      );
      expect(newName).toEqual('packagePolicyName (copy)');
    });

    it('should return packagePolicyName (copy 2) if there is an existing copy', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue({
        items: [
          {
            name: 'packagePolicyName (copy)',
          },
        ],
      });
      const newName = await incrementPackagePolicyCopyName(
        savedObjectsClientMock.create(),
        'packagePolicyName'
      );
      expect(newName).toEqual('packagePolicyName (copy 2)');
    });

    it('should return packagePolicyName (copy 2) if there is an existing copy and copying a copy', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue({
        items: [
          {
            name: 'packagePolicyName (copy)',
          },
        ],
      });
      const newName = await incrementPackagePolicyCopyName(
        savedObjectsClientMock.create(),
        'packagePolicyName (copy)'
      );
      expect(newName).toEqual('packagePolicyName (copy 2)');
    });

    it('should return packagePolicyName (copy 3) if there is 2 copy', async () => {
      packagePolicyService.list = jest.fn().mockResolvedValue({
        items: [
          {
            name: 'packagePolicyName (copy)',
          },
          {
            name: 'packagePolicyName (copy 2)',
          },
        ],
      });
      const newName = await incrementPackagePolicyCopyName(
        savedObjectsClientMock.create(),
        'packagePolicyName'
      );
      expect(newName).toEqual('packagePolicyName (copy 3)');
    });
  });
});
