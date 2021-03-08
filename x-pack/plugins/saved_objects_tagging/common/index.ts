/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TagsCapabilities, getTagsCapabilities } from './capabilities';
export { tagFeatureId, tagSavedObjectTypeName, tagManagementSectionId } from './constants';
export { TagWithRelations, TagAttributes, Tag, ITagsClient, TagSavedObject } from './types';
export {
  TagValidation,
  validateTagColor,
  validateTagName,
  validateTagDescription,
  tagNameMinLength,
  tagNameMaxLength,
  tagDescriptionMaxLength,
} from './validation';
