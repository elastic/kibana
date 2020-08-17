/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'src/core/server';
import { NewOutput, Output, OutputSOAttributes } from '../types';
import { DEFAULT_OUTPUT, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { appContextService } from './app_context';
import { decodeCloudId } from '../../common';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

let cachedAdminUser: null | { username: string; password: string } = null;

class OutputService {
  public async getDefaultOutput(soClient: SavedObjectsClientContract) {
    return await soClient.find<Output>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });
  }

  public async ensureDefaultOutput(soClient: SavedObjectsClientContract) {
    const outputs = await this.getDefaultOutput(soClient);
    const cloud = appContextService.getCloud();
    const cloudId = cloud?.isCloudEnabled && cloud.cloudId;
    const cloudUrl = cloudId && decodeCloudId(cloudId)?.elasticsearchUrl;
    const flagsUrl = appContextService.getConfig()!.fleet.elasticsearch.host;
    const defaultUrl = 'http://localhost:9200';
    const defaultOutputUrl = cloudUrl || flagsUrl || defaultUrl;

    if (!outputs.saved_objects.length) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: [defaultOutputUrl],
        ca_sha256: appContextService.getConfig()!.fleet.elasticsearch.ca_sha256,
      } as NewOutput;

      return await this.create(soClient, newDefaultOutput);
    }

    return {
      ...outputs.saved_objects[0].attributes,
    };
  }

  public async updateOutput(
    soClient: SavedObjectsClientContract,
    id: string,
    data: Partial<NewOutput>
  ) {
    await soClient.update<OutputSOAttributes>(SAVED_OBJECT_TYPE, id, data);
  }

  public async getDefaultOutputId(soClient: SavedObjectsClientContract) {
    const outputs = await this.getDefaultOutput(soClient);

    if (!outputs.saved_objects.length) {
      return null;
    }

    return outputs.saved_objects[0].id;
  }

  public async getAdminUser(soClient: SavedObjectsClientContract) {
    if (cachedAdminUser) {
      return cachedAdminUser;
    }

    const defaultOutputId = await this.getDefaultOutputId(soClient);
    if (!defaultOutputId) {
      return null;
    }
    const so = await appContextService
      .getEncryptedSavedObjects()
      ?.getDecryptedAsInternalUser<OutputSOAttributes>(OUTPUT_SAVED_OBJECT_TYPE, defaultOutputId);

    if (!so || !so.attributes.fleet_enroll_username || !so.attributes.fleet_enroll_password) {
      return null;
    }

    cachedAdminUser = {
      username: so!.attributes.fleet_enroll_username,
      password: so!.attributes.fleet_enroll_password,
    };

    return cachedAdminUser;
  }

  public async create(
    soClient: SavedObjectsClientContract,
    output: NewOutput,
    options?: { id?: string }
  ): Promise<Output> {
    const newSo = await soClient.create<OutputSOAttributes>(
      SAVED_OBJECT_TYPE,
      output as Output,
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
    const outputSO = await soClient.update<OutputSOAttributes>(SAVED_OBJECT_TYPE, id, data);

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

  // Warning! This method is not going to working in a scenario with multiple Kibana instances,
  // in this case Kibana should be restarted if the Admin User change
  public invalidateCache() {
    cachedAdminUser = null;
  }
}

export const outputService = new OutputService();
