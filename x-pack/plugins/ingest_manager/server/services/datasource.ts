/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { AuthenticatedUser } from '../../../security/server';
import { DeleteDatasourcesResponse, packageToConfigDatasource } from '../../common';
import { DATASOURCE_SAVED_OBJECT_TYPE } from '../constants';
import { NewDatasource, Datasource, ListWithKuery } from '../types';
import { agentConfigService } from './agent_config';
import { findInstalledPackageByName, getPackageInfo } from './epm/packages';
import { outputService } from './output';

const SAVED_OBJECT_TYPE = DATASOURCE_SAVED_OBJECT_TYPE;

class DatasourceService {
  public async create(
    soClient: SavedObjectsClientContract,
    datasource: NewDatasource,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<Datasource> {
    const newSo = await soClient.create<Omit<Datasource, 'id'>>(
      SAVED_OBJECT_TYPE,
      {
        ...datasource,
        revision: 1,
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

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Datasource | null> {
    const datasourceSO = await soClient.get<Datasource>(SAVED_OBJECT_TYPE, id);
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
  ): Promise<Datasource[] | null> {
    const datasourceSO = await soClient.bulkGet<Datasource>(
      ids.map(id => ({
        id,
        type: SAVED_OBJECT_TYPE,
      }))
    );
    if (!datasourceSO) {
      return null;
    }

    return datasourceSO.saved_objects.map(so => ({
      id: so.id,
      ...so.attributes,
    }));
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<{ items: Datasource[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;

    const datasources = await soClient.find<Datasource>({
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
      items: datasources.saved_objects.map<Datasource>(datasourceSO => {
        return {
          id: datasourceSO.id,
          ...datasourceSO.attributes,
        };
      }),
      total: datasources.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    datasource: NewDatasource,
    options?: { user?: AuthenticatedUser }
  ): Promise<Datasource> {
    const oldDatasource = await this.get(soClient, id);

    if (!oldDatasource) {
      throw new Error('Datasource not found');
    }

    await soClient.update<Datasource>(SAVED_OBJECT_TYPE, id, {
      ...datasource,
      revision: oldDatasource.revision + 1,
    });

    // Bump revision of associated agent config
    await agentConfigService.bumpRevision(soClient, datasource.config_id, { user: options?.user });

    return (await this.get(soClient, id)) as Datasource;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options?: { user?: AuthenticatedUser }
  ): Promise<DeleteDatasourcesResponse> {
    const result: DeleteDatasourcesResponse = [];

    for (const id of ids) {
      try {
        const oldDatasource = await this.get(soClient, id);
        if (!oldDatasource) {
          throw new Error('Datasource not found');
        }
        await agentConfigService.unassignDatasources(
          soClient,
          oldDatasource.config_id,
          [oldDatasource.id],
          {
            user: options?.user,
          }
        );
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
  ): Promise<NewDatasource | undefined> {
    const pkgInstall = await findInstalledPackageByName({
      savedObjectsClient: soClient,
      pkgName,
    });
    if (pkgInstall) {
      const [pkgInfo, defaultOutputId] = await Promise.all([
        getPackageInfo({
          savedObjectsClient: soClient,
          pkgkey: `${pkgInstall.name}-${pkgInstall.version}`,
        }),
        outputService.getDefaultOutputId(soClient),
      ]);
      if (pkgInfo) {
        return packageToConfigDatasource(pkgInfo, '', defaultOutputId);
      }
    }
  }
}

export const datasourceService = new DatasourceService();
