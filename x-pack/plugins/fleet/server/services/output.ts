/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

import type { NewOutput, Output, OutputSOAttributes } from '../types';
import { DEFAULT_OUTPUT, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { decodeCloudId } from '../../common';

import { appContextService } from './app_context';
import { normalizeHostsForAgents } from './hosts_utils';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

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

    return {
      id: outputs.saved_objects[0].id,
      ...outputs.saved_objects[0].attributes,
    };
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
    const data = { ...output };

    if (data.hosts) {
      data.hosts = data.hosts.map(normalizeHostsForAgents);
    }

    const newSo = await soClient.create<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      data as Output,
      options
    );

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output> {
    const outputSO = await soClient.get<OutputSOAttributes>(SAVED_OBJECT_TYPE, id);

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return {
      id: outputSO.id,
      ...outputSO.attributes,
    };
  }

  public async update(soClient: SavedObjectsClientContract, id: string, data: Partial<Output>) {
    const updateData = { ...data };

    if (updateData.hosts) {
      updateData.hosts = updateData.hosts.map(normalizeHostsForAgents);
    }

    const outputSO = await soClient.update<OutputSOAttributes>(SAVED_OBJECT_TYPE, id, updateData);

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }
  }

  public async list(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<OutputSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 1000,
    });

    return {
      items: outputs.saved_objects.map<Output>((outputSO) => {
        return {
          id: outputSO.id,
          ...outputSO.attributes,
        };
      }),
      total: outputs.total,
      page: 1,
      perPage: 1000,
    };
  }
}

export const outputService = new OutputService();
