/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'src/core/server';
import { NewOutput, Output } from '../types';
import { DEFAULT_OUTPUT, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { appContextService } from './app_context';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

class OutputService {
  public async ensureDefaultOutput(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<Output>({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      filter: `${OUTPUT_SAVED_OBJECT_TYPE}.attributes.is_default:true`,
    });

    if (!outputs.saved_objects.length) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: [appContextService.getConfig()!.fleet.elasticsearch.host],
        ca_sha256: appContextService.getConfig()!.fleet.elasticsearch.ca_sha256,
      } as NewOutput;

      return await this.create(soClient, newDefaultOutput);
    }

    return {
      id: outputs.saved_objects[0].id,
      ...outputs.saved_objects[0].attributes,
    };
  }

  public async updateOutput(
    soClient: SavedObjectsClientContract,
    id: string,
    data: Partial<NewOutput>
  ) {
    await soClient.update<NewOutput>(SAVED_OBJECT_TYPE, id, data);
  }

  public async getDefaultOutputId(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find({
      type: OUTPUT_SAVED_OBJECT_TYPE,
      filter: `${OUTPUT_SAVED_OBJECT_TYPE}.attributes.is_default:true`,
    });

    if (!outputs.saved_objects.length) {
      throw new Error('No default output');
    }

    return outputs.saved_objects[0].id;
  }

  public async getAdminUser(soClient: SavedObjectsClientContract) {
    const defaultOutputId = await this.getDefaultOutputId(soClient);
    const so = await appContextService
      .getEncryptedSavedObjects()
      ?.getDecryptedAsInternalUser<Output>(OUTPUT_SAVED_OBJECT_TYPE, defaultOutputId);

    if (!so || !so.attributes.fleet_enroll_username || !so.attributes.fleet_enroll_password) {
      return null;
    }

    return {
      username: so!.attributes.fleet_enroll_username,
      password: so!.attributes.fleet_enroll_password,
    };
  }

  public async create(
    soClient: SavedObjectsClientContract,
    output: NewOutput,
    options?: { id?: string }
  ): Promise<Output> {
    const newSo = await soClient.create<Output>(SAVED_OBJECT_TYPE, output as Output, options);

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output> {
    const outputSO = await soClient.get<Output>(SAVED_OBJECT_TYPE, id);

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return {
      id: outputSO.id,
      ...outputSO.attributes,
    };
  }

  public async update(soClient: SavedObjectsClientContract, id: string, data: Partial<Output>) {
    const outputSO = await soClient.update<Output>(SAVED_OBJECT_TYPE, id, data);

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }
  }

  public async list(soClient: SavedObjectsClientContract) {
    const outputs = await soClient.find<Output>({
      type: SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 1000,
    });

    return {
      items: outputs.saved_objects.map<Output>(outputSO => {
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
