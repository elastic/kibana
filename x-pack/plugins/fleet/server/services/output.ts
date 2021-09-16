/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import uuid from 'uuid/v5';

import type { NewOutput, Output, OutputSOAttributes } from '../types';
import { DEFAULT_OUTPUT, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { decodeCloudId, normalizeHostsForAgents } from '../../common';

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
  public async getDefaultOutput(soClient: SavedObjectsClientContract) {
    return await soClient.find<OutputSOAttributes>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }

  public async ensureDefaultOutput(soClient: SavedObjectsClientContract) {
    const outputs = await this.getDefaultOutput(soClient);

    if (!outputs.saved_objects.length) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: this.getDefaultESHosts(),
        ca_sha256: appContextService.getConfig()!.agents.elasticsearch.ca_sha256,
      } as NewOutput;

      return await this.create(soClient, newDefaultOutput);
    }

    return outputSavedObjectToOutput(outputs.saved_objects[0]);
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

  public async getDefaultOutputId(soClient: SavedObjectsClientContract) {
    const outputs = await this.getDefaultOutput(soClient);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputs.saved_objects[0].id;
  }

  public async create(
    soClient: SavedObjectsClientContract,
    output: NewOutput,
    options?: { id?: string }
  ): Promise<Output> {
    const data: OutputSOAttributes = { ...output };

    // ensure only default output exists
    if (data.is_default) {
      const defaultOuput = await this.getDefaultOutputId(soClient);
      if (defaultOuput) {
        throw new Error(`A default output already exists (${defaultOuput})`);
      }
    }

    if (data.hosts) {
      data.hosts = data.hosts.map(normalizeHostsForAgents);
    }

    if (options?.id) {
      data.output_id = options?.id;
    }

    const newSo = await soClient.create<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      data,
      options?.id ? { id: outputIdToUuid(options.id) } : undefined
    );

    return {
      id: options?.id ?? newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output> {
    const outputSO = await soClient.get<OutputSOAttributes>(SAVED_OBJECT_TYPE, outputIdToUuid(id));

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return outputSavedObjectToOutput(outputSO);
  }

  public async delete(soClient: SavedObjectsClientContract, id: string) {
    return soClient.delete(SAVED_OBJECT_TYPE, outputIdToUuid(id));
  }

  public async update(soClient: SavedObjectsClientContract, id: string, data: Partial<Output>) {
    const updateData = { ...data };

    if (updateData.hosts) {
      updateData.hosts = updateData.hosts.map(normalizeHostsForAgents);
    }
    const outputSO = await soClient.update<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      outputIdToUuid(id),
      updateData
    );

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }
  }

  public async listPreconfigured(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      filter: `${SAVED_OBJECT_TYPE}.attributes.is_preconfigured:true`,
      page: 1,
      perPage: 10000,
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: 1,
      perPage: 10000,
    };
  }

  public async list(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 1000,
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSavedObjectToOutput),
      total: outputs.total,
      page: 1,
      perPage: 1000,
    };
  }
}

export const outputService = new OutputService();
