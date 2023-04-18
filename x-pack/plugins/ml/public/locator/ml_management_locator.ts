/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import { ML_MANAGEMENT_LOCATOR } from '../../common/constants/locator';

interface LocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export type { MlManagementLocator } from '../../common/types/locator';

export class MlManagementLocatorDefinition implements LocatorDefinition<{}> {
  constructor(protected readonly deps: LocatorDefinitionDependencies) {}

  public readonly id = ML_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (_params: {}): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'insightsAndAlerting',
      appId: 'jobsListLink',
    });

    return location;
  };
}
