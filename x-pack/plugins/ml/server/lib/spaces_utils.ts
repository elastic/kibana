/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from 'kibana/server';
import { Space, SpacesPluginSetup } from '../../../spaces/server';

export type RequestFacade = KibanaRequest | Legacy.Request;

interface GetActiveSpaceResponse {
  valid: boolean;
  space?: Space;
}

export function spacesUtilsProvider(spacesPlugin: SpacesPluginSetup, request: RequestFacade) {
  async function activeSpace(): Promise<GetActiveSpaceResponse> {
    try {
      return {
        valid: true,
        space: await spacesPlugin.spacesService.getActiveSpace(request),
      };
    } catch (e) {
      return {
        valid: false,
      };
    }
  }

  async function isMlEnabledInSpace(): Promise<boolean> {
    const { valid, space } = await activeSpace();
    if (valid === true && space !== undefined) {
      return space.disabledFeatures.includes('ml') === false;
    }
    return true;
  }

  return { isMlEnabledInSpace };
}
