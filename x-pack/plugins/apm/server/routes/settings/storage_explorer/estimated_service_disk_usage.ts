/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { Setup } from '../../../lib/helpers/setup_request';
import { StorageExplorerItem } from '../../../../common/storage_explorer_types';

export function mergeServiceStats({
  serviceStats,
  totalTransactionsPerService,
  totalDocs,
  totalIndexDiskUsage,
}: {
  serviceStats: Array<
    Omit<StorageExplorerItem, 'size' | 'sampling'> & { serviceDocs: number }
  >;
  totalTransactionsPerService: Record<string, number>;
  totalDocs: number;
  totalIndexDiskUsage: number;
}) {
  const mergedServiceStats = serviceStats.map(
    ({ serviceDocs, service, transaction, ...rest }) => {
      const size = (serviceDocs / totalDocs) * totalIndexDiskUsage;
      const sampling = totalTransactionsPerService[service]
        ? transaction / totalTransactionsPerService[service]
        : 0;
      return {
        ...rest,
        service,
        transaction,
        size,
        sampling,
      };
    }
  );

  return mergedServiceStats;
}

export async function getNumberOfApmDocs({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const index = uniq([transaction, span, metric, error]).join();

  const { count: numberOfApmDocs } =
    await context.core.elasticsearch.client.asCurrentUser.count({ index });

  return numberOfApmDocs;
}
