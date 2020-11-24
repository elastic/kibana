/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  ITagInternalClient,
  TagsCache,
  ITagsCache,
  TagsClient,
  ITagsChangeListener,
  isServerValidationError,
  TagServerValidationError,
} from './tags';
export { TagAssignmentService, ITagAssignmentService } from './assignments';
