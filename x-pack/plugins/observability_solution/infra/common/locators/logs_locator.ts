/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { INFRA_LOGS_LOCATOR_ID, LogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import type { InfraClientCoreSetup } from '../../public/types';

export type InfraLogsLocator = LocatorPublic<LogsLocatorParams>;

export interface InfraLogsLocatorDependencies {
  core: InfraClientCoreSetup;
}

export class InfraLogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = INFRA_LOGS_LOCATOR_ID;

  constructor(protected readonly deps: InfraLogsLocatorDependencies) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const { createSearchString } = await import('./helpers');

    const searchString = createSearchString(params);

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
