/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/server';

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';

import {
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  DEFAULT_DOWNLOAD_SOURCE_URI,
  DEFAULT_DOWNLOAD_SOURCE_ID,
} from '../constants';

import type { DownloadSource, DownloadSourceSOAttributes, DownloadSourceBase } from '../types';
import { DownloadSourceError, FleetError } from '../errors';
import { SO_SEARCH_LIMIT } from '../../common';

import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';
import { escapeSearchQueryPhrase } from './saved_object';
import { getFleetProxy } from './fleet_proxies';

function savedObjectToDownloadSource(so: SavedObject<DownloadSourceSOAttributes>) {
  const { source_id: sourceId, ...attributes } = so.attributes;

  return {
    id: sourceId ?? so.id,
    ...attributes,
  };
}

class DownloadSourceService {
  public async get(soClient: SavedObjectsClientContract, id: string): Promise<DownloadSource> {
    const soResponse = await soClient.get<DownloadSourceSOAttributes>(
      DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      id
    );

    if (soResponse.error) {
      throw new FleetError(soResponse.error.message);
    }

    return savedObjectToDownloadSource(soResponse);
  }

  public async list(soClient: SavedObjectsClientContract) {
    const downloadSources = await soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      sortField: 'is_default',
      sortOrder: 'desc',
    });

    return {
      items: downloadSources.saved_objects.map<DownloadSource>(savedObjectToDownloadSource),
      total: downloadSources.total,
      page: downloadSources.page,
      perPage: downloadSources.per_page,
    };
  }

  public async create(
    soClient: SavedObjectsClientContract,
    downloadSource: DownloadSourceBase,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<DownloadSource> {
    const logger = appContextService.getLogger();
    logger.debug(`Creating new download source`);

    const data: DownloadSourceSOAttributes = downloadSource;

    await this.requireUniqueName(soClient, {
      name: downloadSource.name,
      id: options?.id,
    });

    if (data.proxy_id) {
      await this.throwIfProxyNotFound(soClient, data.proxy_id);
    }

    // default should be only one
    if (data.is_default) {
      const defaultDownloadSourceId = await this.getDefaultDownloadSourceId(soClient);

      if (defaultDownloadSourceId) {
        await this.update(soClient, defaultDownloadSourceId, { is_default: false });
      }
    }
    if (options?.id) {
      data.source_id = options?.id;
    }

    const newSo = await soClient.create<DownloadSourceSOAttributes>(
      DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      data,
      {
        id: options?.id,
        overwrite: options?.overwrite ?? false,
      }
    );
    logger.debug(`Creating new download source ${options?.id}`);
    return savedObjectToDownloadSource(newSo);
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    newData: Partial<DownloadSource>
  ) {
    const logger = appContextService.getLogger();
    logger.debug(`Updating download source ${id} with ${newData}`);
    const updateData: Partial<DownloadSourceSOAttributes> = newData;

    if (updateData.proxy_id) {
      await this.throwIfProxyNotFound(soClient, updateData.proxy_id);
    }

    if (updateData.name) {
      await this.requireUniqueName(soClient, {
        name: updateData.name,
        id,
      });
    }

    if (updateData.is_default) {
      const defaultDownloadSourceId = await this.getDefaultDownloadSourceId(soClient);

      if (defaultDownloadSourceId && defaultDownloadSourceId !== id) {
        await this.update(soClient, defaultDownloadSourceId, { is_default: false });
      }
    }
    const soResponse = await soClient.update<DownloadSourceSOAttributes>(
      DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      id,
      updateData
    );
    if (soResponse.error) {
      throw new FleetError(soResponse.error.message);
    } else {
      logger.debug(`Updated download source ${id}`);
    }
  }

  public async delete(soClient: SavedObjectsClientContract, id: string) {
    const logger = appContextService.getLogger();
    logger.debug(`Deleting download source ${id}`);

    const targetDS = await this.get(soClient, id);

    if (targetDS.is_default) {
      throw new DownloadSourceError(`Default Download source ${id} cannot be deleted.`);
    }
    await agentPolicyService.removeDefaultSourceFromAll(
      soClient,
      appContextService.getInternalUserESClient(),
      id
    );
    logger.debug(`Deleted download source ${id}`);
    return soClient.delete(DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE, id);
  }

  public async getDefaultDownloadSourceId(soClient: SavedObjectsClientContract) {
    const results = await this._getDefaultDownloadSourceSO(soClient);

    if (!results.saved_objects.length) {
      return null;
    }

    return savedObjectToDownloadSource(results.saved_objects[0]).id;
  }

  public async ensureDefault(soClient: SavedObjectsClientContract) {
    const downloadSources = await this.list(soClient);

    const defaultDS = downloadSources.items.find((o) => o.is_default);

    if (!defaultDS) {
      const newDefaultDS: DownloadSourceBase = {
        name: 'Elastic Artifacts',
        is_default: true,
        host: DEFAULT_DOWNLOAD_SOURCE_URI,
      };

      return await this.create(soClient, newDefaultDS, {
        id: DEFAULT_DOWNLOAD_SOURCE_ID,
        overwrite: true,
      });
    }

    return defaultDS;
  }

  public async requireUniqueName(
    soClient: SavedObjectsClientContract,
    downloadSource: { name: string; id?: string }
  ) {
    const results = await soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['name'],
      search: escapeSearchQueryPhrase(downloadSource.name),
    });
    const idsWithName = results.total && results.saved_objects.map(({ id }) => id);

    if (Array.isArray(idsWithName)) {
      const isEditingSelf = downloadSource?.id && idsWithName.includes(downloadSource.id);
      if (!downloadSource.id || !isEditingSelf) {
        const isSingle = idsWithName.length === 1;

        const existClause = isSingle
          ? `Download Source '${idsWithName[0]}' already exists`
          : `Download Sources '${idsWithName.join(',')}' already exist`;

        throw new FleetError(`${existClause} with name '${downloadSource.name}'`);
      }
    }
  }

  public async listAllForProxyId(soClient: SavedObjectsClientContract, proxyId: string) {
    const downloadSources = await soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['proxy_id'],
      search: proxyId,
      perPage: SO_SEARCH_LIMIT,
    });

    return {
      items: downloadSources.saved_objects.map<DownloadSource>(savedObjectToDownloadSource),
      total: downloadSources.total,
    };
  }

  private async throwIfProxyNotFound(soClient: SavedObjectsClientContract, id: string) {
    try {
      await getFleetProxy(soClient, id);
    } catch (err) {
      if (err instanceof SavedObjectNotFound) {
        throw new DownloadSourceError(`Proxy ${id} not found`);
      }
      throw new DownloadSourceError(`Error checking proxy_id: ${err.message}`);
    }
  }

  private async _getDefaultDownloadSourceSO(soClient: SavedObjectsClientContract) {
    return await soClient.find<DownloadSourceSOAttributes>({
      type: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }
}

export const downloadSourceService = new DownloadSourceService();
