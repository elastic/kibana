/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigurationBlock } from '../../../../common/domain_types';
import { ReturnTypeBulkUpsert, ReturnTypeList } from '../../../../common/return_types';

export interface FrontendConfigBlocksAdapter {
  upsert(blocks: ConfigurationBlock[]): Promise<ReturnTypeBulkUpsert>;
  getForTags(tagIds: string[], page: number): Promise<ReturnTypeList<ConfigurationBlock>>;
  delete(id: string): Promise<boolean>;
}
