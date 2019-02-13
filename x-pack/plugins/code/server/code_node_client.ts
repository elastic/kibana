/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';

export const CODE_NODE_TYPE = 'code-node';
export const CODE_NODE_ID = 'code-node-info';

export class CodeNodeClient {
  private readonly objectsClient: any;
  constructor(server: Server) {
    const repo = server.savedObjects.getSavedObjectsRepository(
      server.plugins.elasticsearch.getCluster('admin').callWithInternalUser
    );
    this.objectsClient = new server.savedObjects.SavedObjectsClient(repo);
  }

  public async getCodeNodeInfo(): Promise<CodeNodeInfo | undefined> {
    try {
      const ret = await this.objectsClient.get(CODE_NODE_TYPE, CODE_NODE_ID);
      return ret.attributes;
    } catch (e) {
      // NOT FOUND
      return undefined;
    }
  }

  public async createNodeInfo(info: CodeNodeInfo): Promise<CodeNodeInfo> {
    await this.objectsClient.create(CODE_NODE_TYPE, info, { id: CODE_NODE_ID, refresh: true });
    return (await this.getCodeNodeInfo()) as CodeNodeInfo;
  }

  public async deleteNodeInfo() {
    await this.objectsClient.delete(CODE_NODE_TYPE, CODE_NODE_ID);
  }
}

export interface CodeNodeInfo {
  uuid: string;
  url: string;
}

export const mappings = {
  [CODE_NODE_TYPE]: {
    properties: {
      url: {
        type: 'text',
      },
      uuid: {
        type: 'text',
      },
    },
  },
};
