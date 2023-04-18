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
import { INDEX_MANAGEMENT_LOCATOR } from '../common/constants';
import { PLUGIN } from '../common/constants/plugin';

interface LocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export type IndexManagementLocator = LocatorPublic<IndexManagementLocatorParams>;

export interface IndexManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class IndexManagementLocatorDefinition
  implements LocatorDefinition<IndexManagementLocatorParams>
{
  constructor(protected readonly deps: LocatorDefinitionDependencies) {}

  public readonly id = INDEX_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: IndexManagementLocatorParams
  ): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: PLUGIN.id,
    });

    return location;
  };
}
