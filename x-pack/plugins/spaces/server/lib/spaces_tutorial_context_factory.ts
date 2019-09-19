/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesServiceSetup } from '../spaces_service/spaces_service';

export function createSpacesTutorialContextFactory(spacesService: SpacesServiceSetup) {
  return function spacesTutorialContextFactory(request: any) {
    return {
      spaceId: spacesService.getSpaceId(request),
      isInDefaultSpace: spacesService.isInDefaultSpace(request),
    };
  };
}
