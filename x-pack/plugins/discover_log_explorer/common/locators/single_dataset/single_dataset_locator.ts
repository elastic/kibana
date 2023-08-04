/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { LOG_EXPLORER_PROFILE_ID } from '../../constants';
import { SINGLE_DATASET_LOCATOR_ID } from './constants';
import { SingleDatasetLocatorDependencies, SingleDatasetLocatorParams } from './types';

export type SingleDatasetLocator = LocatorPublic<SingleDatasetLocatorParams>;

export class SingleDatasetLocatorDefinition
  implements LocatorDefinition<SingleDatasetLocatorParams>
{
  public readonly id = SINGLE_DATASET_LOCATOR_ID;

  constructor(protected readonly deps: SingleDatasetLocatorDependencies) {}

  public readonly getLocation = async (params: SingleDatasetLocatorParams) => {
    const { integration, dataStream, ...discoverParams } = params;

    const discoverDeepLink = await this.deps.discover.locator?.getLocation({
      ...discoverParams,
      profile: LOG_EXPLORER_PROFILE_ID,
    });

    return discoverDeepLink!;
  };
}
