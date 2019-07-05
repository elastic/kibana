/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationBlock } from '../../../../common/domain_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { FrontendConfigBlocksAdapter } from './adapter_types';

export class RestConfigBlocksAdapter implements FrontendConfigBlocksAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async upsert(blocks: ConfigurationBlock[]) {
    const result = await this.REST.put<
      Array<{ success?: boolean; blockID?: string; error?: string }>
    >(`/api/beats/configurations`, blocks);
    return result;
  }
  public async getForTags(
    tagIds: string[],
    page: number
  ): Promise<{
    error?: string;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  }> {
    return await this.REST.get<{
      error?: string;
      blocks: ConfigurationBlock[];
      page: number;
      total: number;
    }>(`/api/beats/configurations/${tagIds.join(',')}/${page}`);
  }
  public async delete(id: string): Promise<boolean> {
    return (await this.REST.delete<{ success: boolean }>(`/api/beats/configurations/${id}`))
      .success;
  }
}
