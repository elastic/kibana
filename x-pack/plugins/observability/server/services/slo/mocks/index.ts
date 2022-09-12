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
  };
};

export { createResourceInstallerMock, createTransformInstallerMock, createSLORepositoryMock };
