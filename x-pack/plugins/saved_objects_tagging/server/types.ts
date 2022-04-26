/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CustomRequestHandlerContext } from '@kbn/core/server';
import { ITagsClient } from '../common/types';
import { IAssignmentService } from './services';

export interface ITagsRequestHandlerContext {
  tagsClient: ITagsClient;
  assignmentService: IAssignmentService;
}

/**
 * @internal
 */
export type TagsHandlerContext = CustomRequestHandlerContext<{
  tags: ITagsRequestHandlerContext;
}>;

/**
 * @internal
 */
export type TagsPluginRouter = IRouter<TagsHandlerContext>;
