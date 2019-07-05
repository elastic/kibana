/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigurationBlock } from '../../../../common/domain_types';

export interface FrontendConfigBlocksAdapter {
  upsert(
    blocks: ConfigurationBlock[]
  ): Promise<Array<{ success?: boolean; blockID?: string; error?: string }>>;
  getForTags(
    tagIds: string[],
    page: number
  ): Promise<{
    error?: string;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  }>;
  delete(id: string): Promise<boolean>;
}
