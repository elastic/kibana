/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  INFRA_NODE_LOGS_LOCATOR_ID,
  InfraNodeLogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import type { InfraLogsLocatorDependencies } from './logs_locator';

export type InfraNodeLogsLocator = LocatorPublic<InfraNodeLogsLocatorParams>;

export type InfraNodeLogsLocatorDependencies = InfraLogsLocatorDependencies;

export class InfraNodeLogsLocatorDefinition
  implements LocatorDefinition<InfraNodeLogsLocatorParams>
{
  public readonly id = INFRA_NODE_LOGS_LOCATOR_ID;

  constructor(protected readonly deps: InfraNodeLogsLocatorDependencies) {}

  public readonly getLocation = async (params: InfraNodeLogsLocatorParams) => {
    const { createNodeLogsQuery, createSearchString } = await import('./helpers');

    const query = createNodeLogsQuery(params);

    const searchString = createSearchString({ ...params, filter: query });

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
