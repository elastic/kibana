/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { TRANSFORMS_MANAGEMENT_LOCATOR } from '../common/constants';

export type TransformsManagementLocator = LocatorPublic<TransformsManagementLocatorParams>;

export interface TransformsManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class TransformsManagementLocatorDefinition
  implements LocatorDefinition<TransformsManagementLocatorParams>
{
  public readonly id = TRANSFORMS_MANAGEMENT_LOCATOR;

  public readonly getLocation = async (
    _params: TransformsManagementLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/data/transform',
      state: {},
    };
  };
}
