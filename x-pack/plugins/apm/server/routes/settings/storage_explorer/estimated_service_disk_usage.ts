/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, keyBy, mapValues } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { Setup } from '../../../lib/helpers/setup_request';
import { StorageExplorerItem } from '../../../../common/storage_explorer_types';
import { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';

export function mergeServiceStats({
  serviceStats,
  agentConfigs,
  totalDocs,
  totalIndexDiskUsage,
}: {
  serviceStats: Array<
    Omit<StorageExplorerItem, 'size'> & { serviceDocs: number }
  >;
  agentConfigs: AgentConfiguration[];
  totalDocs: number;
  totalIndexDiskUsage: number;
}) {
  const configByServiceName = keyBy(
    agentConfigs,
    (config): string => config.service.name ?? ''
  );

  const sampleRatePerService = mapValues(
    configByServiceName,
    (key): string =>
      (key as AgentConfiguration).settings.transaction_sample_rate
  );

  const mergedServiceStats = serviceStats.map(
    ({ serviceDocs, service, ...rest }) => {
      const size = (serviceDocs / totalDocs) * totalIndexDiskUsage;
      const sampling = sampleRatePerService[service];
      return {
        ...rest,
        service,
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
