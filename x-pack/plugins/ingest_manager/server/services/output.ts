/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract, KibanaRequest } from 'kibana/server';
import { NewOutput, Output } from '../types';
import { DEFAULT_OUTPUT, DEFAULT_OUTPUT_ID, OUTPUT_SAVED_OBJECT_TYPE } from '../constants';
import { appContextService } from './app_context';

const SAVED_OBJECT_TYPE = OUTPUT_SAVED_OBJECT_TYPE;

class OutputService {
  public async createDefaultOutput(
    soClient: SavedObjectsClientContract,
    adminUser: { username: string; password: string }
  ) {
    let defaultOutput;

    try {
      defaultOutput = await this.get(soClient, DEFAULT_OUTPUT_ID);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!defaultOutput) {
      const newDefaultOutput = {
        ...DEFAULT_OUTPUT,
        hosts: [appContextService.getConfig()!.fleet.defaultOutputHost],
        api_key: await this.createDefaultOutputApiKey(adminUser.username, adminUser.password),
        admin_username: adminUser.username,
        admin_password: adminUser.password,
      } as NewOutput;

      await this.create(soClient, newDefaultOutput, {
        id: DEFAULT_OUTPUT_ID,
      });
    }
  }

  public async getAdminUser() {
    const so = await appContextService
      .getEncryptedSavedObjects()
      ?.getDecryptedAsInternalUser<Output>(OUTPUT_SAVED_OBJECT_TYPE, DEFAULT_OUTPUT_ID);

    return {
      username: so!.attributes.admin_username,
      password: so!.attributes.admin_password,
    };
  }

  // TODO: TEMPORARY this is going to be per agent
  private async createDefaultOutputApiKey(username: string, password: string): Promise<string> {
    const key = await appContextService.getSecurity()?.authc.createAPIKey(
      {
        headers: {
          authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
      } as KibanaRequest,
      {
        name: 'fleet-default-output',
        role_descriptors: {
          'fleet-output': {
            cluster: ['monitor'],
            index: [
              {
                names: ['logs-*', 'metrics-*'],
                privileges: ['write'],
              },
            ],
          },
        },
      }
    );
    if (!key) {
      throw new Error('An error occured while creating default API Key');
    }
    return `${key.id}:${key.api_key}`;
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

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<Output | null> {
    const outputSO = await soClient.get<Output>(SAVED_OBJECT_TYPE, id);
    if (!outputSO) {
      return null;
    }

    if (outputSO.error) {
      throw new Error(outputSO.error.message);
    }

    return {
      id: outputSO.id,
      ...outputSO.attributes,
    };
  }
}

export const outputService = new OutputService();
