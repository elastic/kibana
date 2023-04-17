/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { CCR_MANAGEMENT_LOCATOR } from '../common/constants';

export type CcrManagementLocator = LocatorPublic<CcrManagementLocatorParams>;

export interface CcrManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class CcrManagementLocatorDefinition
  implements LocatorDefinition<CcrManagementLocatorParams>
{
  public readonly id = CCR_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: CcrManagementLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/data/cross_cluster_replication',
      state: {},
    };
  };
}
