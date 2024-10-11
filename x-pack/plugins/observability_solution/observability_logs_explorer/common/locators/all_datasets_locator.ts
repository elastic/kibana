/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { AllDatasetSelection } from '@kbn/logs-explorer-plugin/common';
import { ObsLogsExplorerLocatorDependencies } from './types';
import { constructLocatorPath } from './utils';

export type AllDatasetsLocator = LocatorPublic<AllDatasetsLocatorParams>;

export class AllDatasetsLocatorDefinition implements LocatorDefinition<AllDatasetsLocatorParams> {
  public readonly id = ALL_DATASETS_LOCATOR_ID;

  constructor(protected readonly deps: ObsLogsExplorerLocatorDependencies) {}

  public readonly getLocation = (params: AllDatasetsLocatorParams) => {
    const { useHash } = this.deps;

    return constructLocatorPath({
      dataSourceSelection: AllDatasetSelection.getLocatorPlainSelection(),
      locatorParams: params,
      useHash,
    });
  };
}
