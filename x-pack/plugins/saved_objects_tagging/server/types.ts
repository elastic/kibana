/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagsClient } from '../common/types';
import { IAssignmentService } from './services';

export interface ITagsRequestHandlerContext {
  tagsClient: ITagsClient;
  assignmentService: IAssignmentService;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    tags?: ITagsRequestHandlerContext;
  }
}
