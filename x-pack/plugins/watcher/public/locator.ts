/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { LOCATOR } from '../common/constants';

export interface WatcherManagementLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type WatcherManagementLocator = LocatorPublic<WatcherManagementLocatorParams>;

export class WatcherManagementLocatorDefinition
  implements LocatorDefinition<WatcherManagementLocatorParams>
{
  public readonly id = LOCATOR.MANAGEMENT;

  public readonly getLocation = async (
    _params: WatcherManagementLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'management',
      path: '/insightsAndAlerting/watcher',
      state: {},
    };
  };
}
