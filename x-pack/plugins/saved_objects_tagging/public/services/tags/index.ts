/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ITagInternalClient } from './tags_client';
export { TagsClient } from './tags_client';
export type { ITagsChangeListener, ITagsCache } from './tags_cache';
export { TagsCache } from './tags_cache';
export type { TagServerValidationError } from './errors';
export { isServerValidationError } from './errors';
