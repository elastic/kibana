/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';

/**
 * Locator used to link to all log sources in Discover.
 */
export const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

/**
 * Accepts the same parameters as `DiscoverAppLocatorParams`, but automatically sets the `dataViewSpec` param to all log sources.
 */
export type LogsLocatorParams = DiscoverAppLocatorParams;

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(
    private readonly deps: {
      locators: LocatorClient;
      getLogSourcesService(): Promise<LogsDataAccessPluginStart['services']['logSourcesService']>;
    }
  ) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const discoverAppLocator =
      this.deps.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!;

    return discoverAppLocator.getLocation({
      dataViewSpec: params.dataViewSpec ?? (await this.getLogSourcesDataViewSpec()),
      ...params,
    });
  };

  private async getLogSourcesDataViewSpec(): Promise<DataViewSpec> {
    const logSourcesService = await this.deps.getLogSourcesService();
    const logSources = await logSourcesService.getLogSources();
    return {
      title: logSources.map((logSource) => logSource.indexPattern).join(','),
      timeFieldName: '@timestamp',
    };
  }
}
