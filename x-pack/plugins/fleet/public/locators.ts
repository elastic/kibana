/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

import { FLEET_APP_LOCATOR, INTEGRATIONS_APP_LOCATOR } from '../common/constants';

export interface FleetAppLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type FleetAppLocator = LocatorPublic<FleetAppLocatorParams>;

export class FleetAppLocatorDefinition implements LocatorDefinition<FleetAppLocatorParams> {
  public readonly id = FLEET_APP_LOCATOR;

  public readonly getLocation = async (_params: FleetAppLocatorParams): Promise<KibanaLocation> => {
    return {
      app: 'fleet',
      path: '',
      state: {},
    };
  };
}

export interface IntegrationsAppLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type IntegrationsAppLocator = LocatorPublic<IntegrationsAppLocatorParams>;

export class IntegrationsAppLocatorDefinition
  implements LocatorDefinition<IntegrationsAppLocatorParams>
{
  public readonly id = INTEGRATIONS_APP_LOCATOR;

  public readonly getLocation = async (
    _params: IntegrationsAppLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'integrations',
      path: '',
      state: {},
    };
  };
}
