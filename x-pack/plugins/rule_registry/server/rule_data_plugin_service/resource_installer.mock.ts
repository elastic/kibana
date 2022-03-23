/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { IResourceInstaller, ResourceInstaller } from './resource_installer';

type Schema = PublicMethodsOf<ResourceInstaller>;
export type ResourceInstallerMock = jest.Mocked<Schema>;
const createResourceInstallerMock = (): jest.Mocked<IResourceInstaller> => {
  return {
    installCommonResources: jest.fn(),
    installIndexLevelResources: jest.fn(),
    installAndUpdateNamespaceLevelResources: jest.fn(),
  };
};

export const resourceInstallerMock: {
  create: () => ResourceInstallerMock;
} = {
  create: createResourceInstallerMock,
};
