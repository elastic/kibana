/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The id of the tagging feature as registered to `features` plugin
 */
export const tagFeatureId = 'savedObjectsTagging';
/**
 * The saved object type for `tag` objects
 */
export const tagSavedObjectTypeName = 'tag';
/**
 * The management section id as registered to the `management` plugin
 */
export const tagManagementSectionId = 'tags';
/**
 * The list of saved object types that are currently supporting tagging.
 */
export const taggableTypes = [
  'dashboard',
  'visualization',
  'map',
  'lens',
  'search',
  'osquery-pack',
  'osquery-pack-asset',
  'osquery-saved-query',
];
