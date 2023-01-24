/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsTaggingApiUi,
  TagDecoratedSavedObject,
} from '@kbn/saved-objects-tagging-oss-plugin/public';

export const hasTagDecoration: SavedObjectsTaggingApiUi['hasTagDecoration'] = (
  object
): object is TagDecoratedSavedObject => {
  return 'getTags' in object && 'setTags' in object;
};
