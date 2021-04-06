/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { ITagsClient } from '../common/types';
import { ITagsRequestHandlerContext } from './types';
import { TagsClient, IAssignmentService, AssignmentService } from './services';

export class TagsRequestHandlerContext implements ITagsRequestHandlerContext {
  #client?: ITagsClient;
  #assignmentService?: IAssignmentService;

  constructor(
    private readonly request: KibanaRequest,
    private readonly coreContext: RequestHandlerContext['core'],
    private readonly security?: SecurityPluginSetup
  ) {}

  public get tagsClient() {
    if (this.#client == null) {
      this.#client = new TagsClient({ client: this.coreContext.savedObjects.client });
    }
    return this.#client;
  }

  public get assignmentService() {
    if (this.#assignmentService == null) {
      this.#assignmentService = new AssignmentService({
        request: this.request,
        client: this.coreContext.savedObjects.client,
        typeRegistry: this.coreContext.savedObjects.typeRegistry,
        authorization: this.security?.authz,
      });
    }
    return this.#assignmentService;
  }
}
