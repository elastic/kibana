/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  DatasetQualityLocatorParams,
  DATASET_QUALITY_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { DatasetQualityLocatorDependencies } from './types';
import { constructDatasetQualityLocatorPath } from './utils';

export type DatasetQualityLocator = LocatorPublic<DatasetQualityLocatorParams>;

export class DatasetQualityLocatorDefinition
  implements LocatorDefinition<DatasetQualityLocatorParams>
{
  public readonly id = DATASET_QUALITY_LOCATOR_ID;

  constructor(protected readonly deps: DatasetQualityLocatorDependencies) {}

  public readonly getLocation = async (params: DatasetQualityLocatorParams) => {
    const { useHash } = this.deps;
    return constructDatasetQualityLocatorPath({ useHash, locatorParams: params });
  };
}
