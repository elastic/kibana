/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import { EsClient } from './lib/esqueue';

export const CODE_NODE_INDEX_NAME = '.code_node';
export const CODE_NODE_ID = 'code-node-info';

export class CodeNodeClient {
  constructor(readonly client: EsClient) {}

  public async getCodeNodeInfo(): Promise<CodeNodeInfo | undefined> {
    try {
      const ret = await this.client.get({
        index: CODE_NODE_INDEX_NAME,
        id: CODE_NODE_ID,
      });
      return ret._source;
    } catch (e) {
      // NOT FOUND
      return undefined;
    }
  }

  public async createNodeInfo(info: CodeNodeInfo): Promise<CodeNodeInfo> {
    try {
      await this.client.index({
        index: CODE_NODE_INDEX_NAME,
        id: CODE_NODE_ID,
        body: info,
        op_type: 'create',
        refresh: true,
      });
    } catch (e) {
      // other node may have created the doc
    }
    return (await this.getCodeNodeInfo()) as CodeNodeInfo;
  }

  public async createIndex() {
    const exists = await this.client.indices.exists({ index: CODE_NODE_INDEX_NAME });
    if (!exists) {
      await this.client.indices.create({
        index: CODE_NODE_INDEX_NAME,
        body: {
          mappings,
        },
      });
    }
  }
}

export async function clientWithInternalUser(server: Server): Promise<CodeNodeClient> {
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  // @ts-ignore
  const esClient: EsClient = adminCluster.clusterClient.client;
  const client = new CodeNodeClient(esClient);
  await client.createIndex();
  return client;
}

export interface CodeNodeInfo {
  uuid: string;
  url: string;
}

export const mappings = {
  properties: {
    url: {
      type: 'text',
    },
    uuid: {
      type: 'text',
    },
  },
};
