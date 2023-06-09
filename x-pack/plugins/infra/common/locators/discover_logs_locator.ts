/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { LogsLocatorDependencies, LogsLocatorParams } from './logs_locator';
import { LOGS_LOCATOR_ID } from './logs_locator';

export type DiscoverLogsLocator = LocatorPublic<LogsLocatorParams>;

export class DiscoverLogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(protected readonly deps: LogsLocatorDependencies) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const { getLocationToDiscover } = await import('./helpers');

    return getLocationToDiscover({
      core: this.deps.core,
      ...params,
    });
  };
}
