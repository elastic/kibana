/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { SpacesServiceStart } from '../spaces_service/spaces_service';

export function createSpacesTutorialContextFactory(getSpacesService: () => SpacesServiceStart) {
  return function spacesTutorialContextFactory(request: KibanaRequest) {
    const spacesService = getSpacesService();
    return {
      spaceId: spacesService.getSpaceId(request),
      isInDefaultSpace: spacesService.isInDefaultSpace(request),
    };
  };
}
