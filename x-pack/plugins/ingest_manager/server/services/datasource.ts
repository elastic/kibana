/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import {
  DeletePackageConfigsResponse,
  packageToConfigDatasource,
  PackageConfigInput,
  PackageConfigInputStream,
  PackageInfo,
} from '../../common';
import { PACKAGE_CONFIG_SAVED_OBJECT_TYPE } from '../constants';
import {
  NewPackageConfig,
  PackageConfig,
  ListWithKuery,
  PackageConfigSOAttributes,
  RegistryPackage,
} from '../types';
import { agentConfigService } from './agent_config';
import { outputService } from './output';
import * as Registry from './epm/registry';
import { getPackageInfo, getInstallation } from './epm/packages';
import { getAssetsData } from './epm/packages/assets';
import { createStream } from './epm/agent/agent';

const SAVED_OBJECT_TYPE = PACKAGE_CONFIG_SAVED_OBJECT_TYPE;

function getDataset(st: string) {
  return st.split('.')[1];
}

class DatasourceService {
  public async create(
    soClient: SavedObjectsClientContract,
    datasource: NewPackageConfig,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<PackageConfig> {
    const isoDate = new Date().toISOString();
    const newSo = await soClient.create<PackageConfigSOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...datasource,
        revision: 1,
        created_at: isoDate,
        created_by: options?.user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: options?.user?.username ?? 'system',
      },
      options
    );

    // Assign it to the given agent config
    await agentConfigService.assignDatasources(soClient, datasource.config_id, [newSo.id], {
      user: options?.user,
    });

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async bulkCreate(
    soClient: SavedObjectsClientContract,
    datasources: NewPackageConfig[],
    configId: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<PackageConfig[]> {
    const isoDate = new Date().toISOString();
    const { saved_objects: newSos } = await soClient.bulkCreate<Omit<PackageConfig, 'id'>>(
      datasources.map((datasource) => ({
        type: SAVED_OBJECT_TYPE,
        attributes: {
          ...datasource,
          config_id: configId,
          revision: 1,
          created_at: isoDate,
          created_by: options?.user?.username ?? 'system',
          updated_at: isoDate,
          updated_by: options?.user?.username ?? 'system',
        },
      }))
    );

    // Assign it to the given agent config
    await agentConfigService.assignDatasources(
      soClient,
      configId,
      newSos.map((newSo) => newSo.id),
      {
        user: options?.user,
      }
    );

    return newSos.map((newSo) => ({
      id: newSo.id,
      ...newSo.attributes,
    }));
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<PackageConfig | null> {
    const datasourceSO = await soClient.get<PackageConfigSOAttributes>(SAVED_OBJECT_TYPE, id);
    if (!datasourceSO) {
      return null;
    }

    if (datasourceSO.error) {
      throw new Error(datasourceSO.error.message);
    }

    return {
      id: datasourceSO.id,
      ...datasourceSO.attributes,
    };
  }

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<PackageConfig[] | null> {
    const datasourceSO = await soClient.bulkGet<PackageConfigSOAttributes>(
      ids.map((id) => ({
        id,
        type: SAVED_OBJECT_TYPE,
      }))
    );
    if (!datasourceSO) {
      return null;
    }

    return datasourceSO.saved_objects.map((so) => ({
      id: so.id,
      ...so.attributes,
    }));
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<{ items: PackageConfig[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;

    const datasources = await soClient.find<PackageConfigSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page,
      perPage,
      // To ensure users don't need to know about SO data structure...
      filter: kuery
        ? kuery.replace(
            new RegExp(`${SAVED_OBJECT_TYPE}\.`, 'g'),
            `${SAVED_OBJECT_TYPE}.attributes.`
          )
        : undefined,
    });

    return {
      items: datasources.saved_objects.map<PackageConfig>((datasourceSO) => ({
        id: datasourceSO.id,
        ...datasourceSO.attributes,
      })),
      total: datasources.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    datasource: NewPackageConfig,
    options?: { user?: AuthenticatedUser }
  ): Promise<PackageConfig> {
    const oldDatasource = await this.get(soClient, id);

    if (!oldDatasource) {
      throw new Error('Datasource not found');
    }

    await soClient.update<PackageConfigSOAttributes>(SAVED_OBJECT_TYPE, id, {
      ...datasource,
      revision: oldDatasource.revision + 1,
      updated_at: new Date().toISOString(),
      updated_by: options?.user?.username ?? 'system',
    });

    // Bump revision of associated agent config
    await agentConfigService.bumpRevision(soClient, datasource.config_id, { user: options?.user });

    return (await this.get(soClient, id)) as PackageConfig;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options?: { user?: AuthenticatedUser; skipUnassignFromAgentConfigs?: boolean }
  ): Promise<DeletePackageConfigsResponse> {
    const result: DeletePackageConfigsResponse = [];

    for (const id of ids) {
      try {
        const oldDatasource = await this.get(soClient, id);
        if (!oldDatasource) {
          throw new Error('Datasource not found');
        }
        if (!options?.skipUnassignFromAgentConfigs) {
          await agentConfigService.unassignDatasources(
            soClient,
            oldDatasource.config_id,
            [oldDatasource.id],
            {
              user: options?.user,
            }
          );
        }
        await soClient.delete(SAVED_OBJECT_TYPE, id);
        result.push({
          id,
          success: true,
        });
      } catch (e) {
        result.push({
          id,
          success: false,
        });
      }
    }

    return result;
  }

  public async buildDatasourceFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string
  ): Promise<NewPackageConfig | undefined> {
    const pkgInstall = await getInstallation({ savedObjectsClient: soClient, pkgName });
    if (pkgInstall) {
      const [pkgInfo, defaultOutputId] = await Promise.all([
        getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: pkgInstall.name,
          pkgVersion: pkgInstall.version,
        }),
        outputService.getDefaultOutputId(soClient),
      ]);
      if (pkgInfo) {
        if (!defaultOutputId) {
          throw new Error('Default output is not set');
        }
        return packageToConfigDatasource(pkgInfo, '', defaultOutputId);
      }
    }
  }

  public async assignPackageStream(
    pkgInfo: PackageInfo,
    inputs: PackageConfigInput[]
  ): Promise<PackageConfigInput[]> {
    const registryPkgInfo = await Registry.fetchInfo(pkgInfo.name, pkgInfo.version);
    const inputsPromises = inputs.map((input) =>
      _assignPackageStreamToInput(registryPkgInfo, pkgInfo, input)
    );

    return Promise.all(inputsPromises);
  }
}

async function _assignPackageStreamToInput(
  registryPkgInfo: RegistryPackage,
  pkgInfo: PackageInfo,
  input: PackageConfigInput
) {
  const streamsPromises = input.streams.map((stream) =>
    _assignPackageStreamToStream(registryPkgInfo, pkgInfo, input, stream)
  );

  const streams = await Promise.all(streamsPromises);
  return { ...input, streams };
}

async function _assignPackageStreamToStream(
  registryPkgInfo: RegistryPackage,
  pkgInfo: PackageInfo,
  input: PackageConfigInput,
  stream: PackageConfigInputStream
) {
  if (!stream.enabled) {
    return { ...stream, agent_stream: undefined };
  }
  const datasetPath = getDataset(stream.dataset.name);
  const packageDatasets = pkgInfo.datasets;
  if (!packageDatasets) {
    throw new Error('Stream template not found, no datasets');
  }

  const packageDataset = packageDatasets.find(
    (pkgDataset) => pkgDataset.name === stream.dataset.name
  );
  if (!packageDataset) {
    throw new Error(`Stream template not found, unable to find dataset ${datasetPath}`);
  }

  const streamFromPkg = (packageDataset.streams || []).find(
    (pkgStream) => pkgStream.input === input.type
  );
  if (!streamFromPkg) {
    throw new Error(`Stream template not found, unable to find stream for input ${input.type}`);
  }

  if (!streamFromPkg.template_path) {
    throw new Error(`Stream template path not found for dataset ${datasetPath}`);
  }

  const [pkgStream] = await getAssetsData(
    registryPkgInfo,
    (path: string) => path.endsWith(streamFromPkg.template_path),
    datasetPath
  );

  if (!pkgStream || !pkgStream.buffer) {
    throw new Error(
      `Unable to load stream template ${streamFromPkg.template_path} for dataset ${datasetPath}`
    );
  }

  const yaml = createStream(
    // Populate template variables from input vars and stream vars
    Object.assign({}, input.vars, stream.vars),
    pkgStream.buffer.toString()
  );

  stream.agent_stream = yaml;

  return { ...stream };
}

export type DatasourceServiceInterface = DatasourceService;
export const datasourceService = new DatasourceService();
