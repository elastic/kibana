/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../../src/core/server';
import { Space, SpacesPluginStart } from '../../../spaces/server';

export type RequestFacade = KibanaRequest | Legacy.Request;

interface GetActiveSpaceResponse {
  valid: boolean;
  space?: Space;
}

export function spacesUtilsProvider(
  getSpaces: () => Promise<SpacesPluginStart>,
  request: RequestFacade
) {
  async function activeSpace(): Promise<GetActiveSpaceResponse> {
    try {
      return {
        valid: true,
        space: await (await getSpaces()).spacesService.getActiveSpace(
          request instanceof KibanaRequest ? request : KibanaRequest.from(request)
        ),
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
