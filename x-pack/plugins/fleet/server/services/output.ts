/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from 'src/core/server';
import uuid from 'uuid/v5';

import type { ISavedObjectsRepository } from 'kibana/server';

import type { NewOutput, Output, OutputSOAttributes } from '../types';
import { DEFAULT_OUTPUT, DEFAULT_OUTPUT_ID, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { decodeCloudId, normalizeHostsForAgents, SO_SEARCH_LIMIT } from '../../common';
import { OutputUnauthorizedError } from '../errors';

import { appContextService } from './app_context';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

// differentiate
function isUUID(val: string) {
  return (
    typeof val === 'string' &&
    val.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/)
  );
}

export function outputIdToUuid(id: string) {
  if (isUUID(id)) {
    return id;
  }

  // UUID v5 need a namespace (uuid.DNS), changing this params will result in loosing the ability to generate predicable uuid
  return uuid(id, uuid.DNS);
}

function outputSavedObjectToOutput(so: SavedObject<OutputSOAttributes>) {
  const { output_id: outputId, ...atributes } = so.attributes;
  return {
    id: outputId ?? so.id,
    ...atributes,
  };
}

class OutputService {
  private async _getDefaultDataOutputsSO(soRepo: ISavedObjectsRepository) {
    return await soRepo.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }

  private async _getDefaultMonitoringOutputsSO(soRepo: ISavedObjectsRepository) {
    return await soRepo.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default_monitoring'],
      search: 'true',
    });
  }

  public async ensureDefaultOutput(soRepo: ISavedObjectsRepository) {
    const outputs = await this.list(soRepo);

    const defaultOutput = outputs.items.find((o) => o.is_default);
    const defaultMonitoringOutput = outputs.items.find((o) => o.is_default_monitoring);

    if (!defaultOutput) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: this.getDefaultESHosts(),
        ca_sha256: appContextService.getConfig()!.agents.elasticsearch.ca_sha256,
        is_default_monitoring: !defaultMonitoringOutput,
      } as NewOutput;

      return await this.create(soRepo, newDefaultOutput, {
        id: DEFAULT_OUTPUT_ID,
        overwrite: true,
      });
    }

    return defaultOutput;
  }

  public getDefaultESHosts(): string[] {
    const cloud = appContextService.getCloud();
    const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
    const cloudUrl = cloudId && decodeCloudId(cloudId)?.elasticsearchUrl;
    const cloudHosts = cloudUrl ? [cloudUrl] : undefined;
    const flagHosts =
      appContextService.getConfig()!.agents?.elasticsearch?.hosts &&
      appContextService.getConfig()!.agents.elasticsearch.hosts?.length
        ? appContextService.getConfig()!.agents.elasticsearch.hosts
        : undefined;

    return cloudHosts || flagHosts || DEFAULT_ES_HOSTS;
  }

  public async getDefaultDataOutputId(soRepo: ISavedObjectsRepository) {
    const outputs = await this._getDefaultDataOutputsSO(soRepo);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async getDefaultMonitoringOutputId(soRepo: ISavedObjectsRepository) {
    const outputs = await this._getDefaultMonitoringOutputsSO(soRepo);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]).id;
  }

  public async create(
    soRepo: ISavedObjectsRepository,
    output: NewOutput,
    options?: { id?: string; fromPreconfiguration?: boolean; overwrite?: boolean }
  ): Promise<Output> {
    const data: OutputSOAttributes = { ...output };

    // ensure only default output exists
    if (data.is_default) {
      const defaultDataOuputId = await this.getDefaultDataOutputId(soRepo);
      if (defaultDataOuputId) {
        await this.update(
          soRepo,
          defaultDataOuputId,
          { is_default: false },
          { fromPreconfiguration: options?.fromPreconfiguration ?? false }
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId(soRepo);
      if (defaultMonitoringOutputId) {
        await this.update(
          soRepo,
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          { fromPreconfiguration: options?.fromPreconfiguration ?? false }
        );
      }
    }

    if (data.hosts) {
      data.hosts = data.hosts.map(normalizeHostsForAgents);
    }

    if (options?.id) {
      data.output_id = options?.id;
    }

    const newSo = await soRepo.create<OutputSOAttributes>(SAVED_OBJECT_TYPE, data, {
      overwrite: options?.overwrite || options?.fromPreconfiguration,
      id: options?.id ? outputIdToUuid(options.id) : undefined,
    });

    return {
      id: options?.id ?? newSo.id,
      ...newSo.attributes,
    };
  }

  public async bulkGet(
    soRepo: ISavedObjectsRepository,
    ids: string[],
    { ignoreNotFound = false } = { ignoreNotFound: true }
  ) {
    const res = await soRepo.bulkGet<OutputSOAttributes>(
      ids.map((id) => ({ id: outputIdToUuid(id), type: SAVED_OBJECT_TYPE }))
    );

    return res.saved_objects
      .map((so) => {
        if (so.error) {
          if (!ignoreNotFound || so.error.statusCode !== 404) {
            throw so.error;
          }
          return undefined;
        }

        return outputSavedObjectToOutput(so);
      })
      .filter((output): output is Output => typeof output !== 'undefined');
  }

  public async list(soRepo: ISavedObjectsRepository) {
    const outputs = await soRepo.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      sortField: 'is_default',
      sortOrder: 'desc',
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: outputs.page,
      perPage: outputs.per_page,
    };
  }

  public async get(soRepo: ISavedObjectsRepository, id: string): Promise<Output> {
    const outputSO = await soRepo.get<OutputSOAttributes>(SAVED_OBJECT_TYPE, outputIdToUuid(id));

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return outputSavedObjectToOutput(outputSO);
  }

  public async delete(
    soRepo: ISavedObjectsRepository,
    id: string,
    { fromPreconfiguration = false }: { fromPreconfiguration?: boolean } = {
      fromPreconfiguration: false,
    }
  ) {
    const originalOutput = await this.get(soRepo, id);

    if (originalOutput.is_preconfigured && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(
        `Preconfigured output ${id} cannot be deleted outside of kibana config file.`
      );
    }

    if (originalOutput.is_default && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default output ${id} cannot be deleted.`);
    }

    if (originalOutput.is_default_monitoring && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(`Default monitoring output ${id} cannot be deleted.`);
    }

    return soRepo.delete(SAVED_OBJECT_TYPE, outputIdToUuid(id));
  }

  public async update(
    soRepo: ISavedObjectsRepository,
    id: string,
    data: Partial<Output>,
    { fromPreconfiguration = false }: { fromPreconfiguration: boolean } = {
      fromPreconfiguration: false,
    }
  ) {
    const originalOutput = await this.get(soRepo, id);

    if (originalOutput.is_preconfigured && !fromPreconfiguration) {
      throw new OutputUnauthorizedError(
        `Preconfigured output ${id} cannot be updated outside of kibana config file.`
      );
    }

    const updateData = { ...data };

    // ensure only default output exists
    if (data.is_default) {
      const defaultDataOuputId = await this.getDefaultDataOutputId(soRepo);
      if (defaultDataOuputId && defaultDataOuputId !== id) {
        await this.update(
          soRepo,
          defaultDataOuputId,
          { is_default: false },
          { fromPreconfiguration }
        );
      }
    }
    if (data.is_default_monitoring) {
      const defaultMonitoringOutputId = await this.getDefaultMonitoringOutputId(soRepo);

      if (defaultMonitoringOutputId && defaultMonitoringOutputId !== id) {
        await this.update(
          soRepo,
          defaultMonitoringOutputId,
          { is_default_monitoring: false },
          { fromPreconfiguration }
        );
      }
    }

    if (updateData.hosts) {
      updateData.hosts = updateData.hosts.map(normalizeHostsForAgents);
    }
    const outputSO = await soRepo.update<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id),
      updateData
    );

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }
  }
}

export const outputService = new OutputService();
