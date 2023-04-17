/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import { ML_MANAGEMENT_LOCATOR } from '../../common/constants/locator';

export type { MlManagementLocator } from '../../common/types/locator';

export class MlManagementLocatorDefinition implements LocatorDefinition<{}> {
  public readonly id = ML_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (_params: {}): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/insightsAndAlerting/jobsListLink',
      state: {},
    };
  };
}
