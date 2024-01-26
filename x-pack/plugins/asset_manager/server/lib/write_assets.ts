/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import { debug } from '../../common/debug_log';
import { Asset } from '../../common/types_api';
import { ASSETS_INDEX_PREFIX } from '../constants';
import { ElasticsearchAccessorOptions } from '../types';

interface WriteAssetsOptions extends ElasticsearchAccessorOptions {
  assetDocs: Asset[];
  namespace?: string;
  refresh?: boolean | 'wait_for';
}

export async function writeAssets({
  elasticsearchClient,
  assetDocs,
  namespace = 'default',
  refresh = false,
}: WriteAssetsOptions) {
  const dsl: BulkRequest<Asset> = {
    refresh,
    operations: assetDocs.flatMap((asset) => [
      { create: { _index: `${ASSETS_INDEX_PREFIX}-${asset['asset.type']}-${namespace}` } },
      asset,
    ]),
  };

  debug('Performing Write Asset Query', '\n\n', JSON.stringify(dsl, null, 2));

  return await elasticsearchClient.bulk<{}>(dsl);
}
