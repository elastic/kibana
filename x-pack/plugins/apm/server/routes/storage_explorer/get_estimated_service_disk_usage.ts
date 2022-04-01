/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmPluginRequestHandlerContext } from '../typings';
import { Setup } from '../../lib/helpers/setup_request';
import { StorageExplorerItem } from '../../../common/storage_explorer_types';

export function mergeServiceStats({
  serviceStats,
  totalDocs,
  totalIndexDiskUsage,
}: {
  serviceStats: Array<
    Omit<StorageExplorerItem, 'size'> & { serviceDocs: number }
  >;
  totalDocs: number;
  totalIndexDiskUsage: number;
}) {
  const mergedServiceStats = serviceStats.map(({ serviceDocs, ...rest }) => {
    const size = (serviceDocs / totalDocs) * totalIndexDiskUsage;
    return {
      ...rest,
      size,
    };
  });

  return mergedServiceStats;
}

export async function getTotalDocs({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const { indices } = setup;
  const index = [
    indices.transaction,
    indices.span,
    indices.metric,
    indices.error,
  ].join();

  const { count } = await context.core.elasticsearch.client.asCurrentUser.count(
    {
      index,
    }
  );

  return count;
}
