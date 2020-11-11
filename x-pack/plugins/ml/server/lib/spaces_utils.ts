/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from 'kibana/server';
import { SpacesPluginSetup } from '../../../spaces/server';

export type RequestFacade = KibanaRequest | Legacy.Request;

export function spacesUtilsProvider(
  spacesPlugin: SpacesPluginSetup | undefined,
  request: RequestFacade
) {
  async function isMlEnabledInSpace(): Promise<boolean> {
    if (spacesPlugin === undefined) {
      // if spaces is disabled force isMlEnabledInSpace to be true
      return true;
    }
    const space = await spacesPlugin.spacesService.getActiveSpace(request);
    return space.disabledFeatures.includes('ml') === false;
  }

  async function getAllSpaces(): Promise<string[] | null> {
    if (spacesPlugin === undefined) {
      return null;
    }
    const client = await spacesPlugin.spacesService.scopedClient(request);
    const spaces = await client.getAll();
    return spaces.map((s) => s.id);
  }

  return { isMlEnabledInSpace, getAllSpaces };
}
