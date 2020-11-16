/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesPluginStart } from '../../../spaces/server';

export type RequestFacade = KibanaRequest | Legacy.Request;

export function spacesUtilsProvider(
  getSpacesPlugin: (() => Promise<SpacesPluginStart>) | undefined,
  request: RequestFacade
) {
  async function isMlEnabledInSpace(): Promise<boolean> {
    if (getSpacesPlugin === undefined) {
      // if spaces is disabled force isMlEnabledInSpace to be true
      return true;
    }
    const space = await (await getSpacesPlugin()).spacesService.getActiveSpace(
      request instanceof KibanaRequest ? request : KibanaRequest.from(request)
    );
    return space.disabledFeatures.includes('ml') === false;
  }

  async function getAllSpaces(): Promise<string[] | null> {
    if (getSpacesPlugin === undefined) {
      return null;
    }
    const client = (await getSpacesPlugin()).spacesService.createSpacesClient(
      request instanceof KibanaRequest ? request : KibanaRequest.from(request)
    );
    const spaces = await client.getAll();
    return spaces.map((s) => s.id);
  }

  return { isMlEnabledInSpace, getAllSpaces };
}
