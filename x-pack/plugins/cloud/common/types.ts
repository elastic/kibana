/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export type OnBoardingDefaultSolution = 'es' | 'oblt' | 'security';

/* FUTURE Engineer
 * This is types are here because if we inject the types from spaces
 * we are getting a circular dependency, we will need to move these types in a package
 * x-pack/plugins/spaces/server/spaces_service/spaces_service.ts
 * x-pack/plugins/spaces/server/spaces_client/spaces_client.ts
 * x-pack/plugins/spaces/common/types/space/v1.ts
 */
export interface InternalSpaceClient {
  /**
   * Retrieve a space by its id.
   * @param id the space id.
   */
  get(id: string): Promise<object>;

  /**
   * Updates a space.
   * @param id  the id of the space to update.
   * @param space the updated space.
   */
  update(id: string, space: object): Promise<object>;
}
interface InternalSpacesService {
  createSpacesClient: (request: KibanaRequest) => InternalSpaceClient;
}

export interface InternalSpacesContract {
  spacesService: InternalSpacesService;
}
