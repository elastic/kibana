/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../../src/core/server';
import { SpacesPluginStart } from '../../../spaces/server';
import { PLUGIN_ID } from '../../common/constants/app';

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
    return space.disabledFeatures.includes(PLUGIN_ID) === false;
  }

  async function getAllSpaces() {
    if (getSpacesPlugin === undefined) {
      return null;
    }
    const client = (await getSpacesPlugin()).spacesService.createSpacesClient(
      request instanceof KibanaRequest ? request : KibanaRequest.from(request)
    );
    return await client.getAll();
  }

  async function getAllSpaceIds(): Promise<string[] | null> {
    const spaces = await getAllSpaces();
    if (spaces === null) {
      return null;
    }
    return spaces.map((s) => s.id);
  }

  async function getMlSpaceIds(): Promise<string[] | null> {
    const spaces = await getAllSpaces();
    if (spaces === null) {
      return null;
    }
    return spaces.filter((s) => s.disabledFeatures.includes(PLUGIN_ID) === false).map((s) => s.id);
  }

  return { isMlEnabledInSpace, getAllSpaces, getAllSpaceIds, getMlSpaceIds };
}
