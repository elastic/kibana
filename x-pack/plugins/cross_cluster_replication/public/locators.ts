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
import { CCR_MANAGEMENT_LOCATOR, MANAGEMENT_ID } from '../common/constants';

interface LocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export type CcrManagementLocator = LocatorPublic<CcrManagementLocatorParams>;

export interface CcrManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class CcrManagementLocatorDefinition
  implements LocatorDefinition<CcrManagementLocatorParams>
{
  constructor(protected readonly deps: LocatorDefinitionDependencies) {}

  public readonly id = CCR_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: CcrManagementLocatorParams
  ): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: MANAGEMENT_ID,
    });

    return location;
  };
}
