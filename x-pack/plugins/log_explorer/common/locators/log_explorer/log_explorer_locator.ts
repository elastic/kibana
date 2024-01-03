/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  LogExplorerLocatorParams,
  LOG_EXPLORER_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { LogExplorerLocatorDependencies } from './types';

export type LogExplorerLocator = LocatorPublic<LogExplorerLocatorParams>;

export class LogExplorerLocatorDefinition implements LocatorDefinition<LogExplorerLocatorParams> {
  public readonly id = LOG_EXPLORER_LOCATOR_ID;

  constructor(protected readonly deps: LogExplorerLocatorDependencies) {}

  public readonly getLocation = (params: LogExplorerLocatorParams) => {
    const { dataset } = params;
    const dataViewSpec: DataViewSpec | undefined = dataset
      ? {
          id: dataset,
          title: dataset,
        }
      : undefined;

    return this.deps.discoverAppLocator?.getLocation({
      ...params,
      dataViewId: dataset,
      dataViewSpec,
    })!;
  };
}
