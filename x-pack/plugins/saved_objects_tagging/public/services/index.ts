/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ITagInternalClient,
  ITagsCache,
  ITagsChangeListener,
  TagServerValidationError,
} from './tags';
export { TagsCache, TagsClient, isServerValidationError } from './tags';
export type { ITagAssignmentService } from './assignments';
export { TagAssignmentService } from './assignments';
