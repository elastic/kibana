/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppTileMapLocatorParams, MapsAppTileMapLocatorDependencies } from './types';

export const MAPS_APP_TILE_MAP_LOCATOR = 'MAPS_APP_TILE_MAP_LOCATOR' as const;

export class MapsAppTileMapLocatorDefinition
  implements LocatorDefinition<MapsAppTileMapLocatorParams>
{
  public readonly id = MAPS_APP_TILE_MAP_LOCATOR;

  constructor(protected readonly deps: MapsAppTileMapLocatorDependencies) {}

  public readonly getLocation = async (params: MapsAppTileMapLocatorParams) => {
    const { getLocation } = await import('./get_location');
    return getLocation(params, this.deps);
  };
}
