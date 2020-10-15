/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsTaggingApiUi,
  TagDecoratedSavedObject,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public';

export const hasTagDecoration: SavedObjectsTaggingApiUi['hasTagDecoration'] = (
  object
): object is TagDecoratedSavedObject => {
  return 'getTags' in object && 'setTags' in object;
};
