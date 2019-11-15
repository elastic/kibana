/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContextProvider, RequestHandler } from 'src/core/server';
import { SpacesServiceSetup } from './spaces_service/spaces_service';

export function createRouteHandlerContext(
  spacesService: SpacesServiceSetup
): IContextProvider<RequestHandler<any, any, any>, 'spaces'> {
  return function spacesRouteHandlerContext(context, request) {
    return {
      getSpaceId: () => spacesService.getSpaceId(request),
    };
  };
}
