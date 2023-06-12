/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../../../common/types_api';
import { GetHostsOptionsInjected } from '.';
import { getAssets } from '../../get_assets';

export async function getHostsByAssets(
  options: GetHostsOptionsInjected
): Promise<{ hosts: Asset[] }> {
  const hosts = await getAssets({
    esClient: options.esClient,
    filters: {
      kind: 'host',
      from: options.from,
      to: options.to,
    },
  });

  return {
    hosts,
  };
}
