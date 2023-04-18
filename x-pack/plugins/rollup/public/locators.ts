/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { ROLLUP_MANAGEMENT_LOCATOR } from '../common';

interface LocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export type RollupManagementLocator = LocatorPublic<RollupManagementLocatorParams>;

export interface RollupManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class RollupManagementLocatorDefinition
  implements LocatorDefinition<RollupManagementLocatorParams>
{
  constructor(protected readonly deps: LocatorDefinitionDependencies) {}

  public readonly id = ROLLUP_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: RollupManagementLocatorParams
  ): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: 'rollup_jobs',
    });

    return location;
  };
}
