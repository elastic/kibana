/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DatasetLocatorDependencies } from '../types';
import { SingleDatasetLocatorParams } from './types';
import { SINGLE_DATASET_LOCATOR_ID, constructLocatorPath } from '../utils';

export type SingleDatasetLocator = LocatorPublic<SingleDatasetLocatorParams>;

export class SingleDatasetLocatorDefinition
  implements LocatorDefinition<SingleDatasetLocatorParams>
{
  public readonly id = SINGLE_DATASET_LOCATOR_ID;

  constructor(protected readonly deps: DatasetLocatorDependencies) {}

  public readonly getLocation = async (params: SingleDatasetLocatorParams) => {
    const { useHash, datasetsClient } = this.deps;
    const { integration, dataset } = params;

    const index = await datasetsClient.generateDataViewId(integration, dataset);

    return await constructLocatorPath({
      locatorParams: params,
      index,
      useHash,
    });
  };
}
