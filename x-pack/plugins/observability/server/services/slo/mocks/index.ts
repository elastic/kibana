/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceInstaller } from '../resource_installer';
import { SLORepository } from '../slo_repository';
import { TransformInstaller } from '../transform_installer';

const createResourceInstallerMock = (): jest.Mocked<ResourceInstaller> => {
  return {
    ensureCommonResourcesInstalled: jest.fn(),
  };
};

const createTransformInstallerMock = (): jest.Mocked<TransformInstaller> => {
  return {
    installAndStartTransform: jest.fn(),
  };
};

const createSLORepositoryMock = (): jest.Mocked<SLORepository> => {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    deleteById: jest.fn(),
  };
};

export { createResourceInstallerMock, createTransformInstallerMock, createSLORepositoryMock };
