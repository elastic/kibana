/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsTaggingApiUi } from '../../../../../src/plugins/saved_objects_tagging_oss/public';
import { ITagsCache } from '../services';
import { convertTagNameToId } from '../utils';

export interface BuildConvertNameToReferenceOptions {
  cache: ITagsCache;
}

export const buildConvertNameToReference = ({
  cache,
}: BuildConvertNameToReferenceOptions): SavedObjectsTaggingApiUi['convertNameToReference'] => {
  return (tagName: string) => {
    const tagId = convertTagNameToId(tagName, cache.getState());
    return tagId ? { type: 'tag', id: tagId } : undefined;
  };
};
