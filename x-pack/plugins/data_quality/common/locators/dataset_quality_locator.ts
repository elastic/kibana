/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  DataQualityLocatorDependencies,
  DataQualityLocatorParams,
  DATA_QUALITY_LOCATOR_ID,
} from './types';
import { constructDatasetQualityLocatorPath } from './construct_dataset_quality_locator_path';

export type DatasetQualityLocator = LocatorPublic<DataQualityLocatorParams>;

export class DatasetQualityLocatorDefinition
  implements LocatorDefinition<DataQualityLocatorParams>
{
  public readonly id = DATA_QUALITY_LOCATOR_ID;

  constructor(protected readonly deps: DataQualityLocatorDependencies) {}

  public readonly getLocation = async (params: DataQualityLocatorParams) => {
    const { useHash, managementLocator } = this.deps;
    return await constructDatasetQualityLocatorPath({
      useHash,
      managementLocator,
      locatorParams: params,
    });
  };
}
