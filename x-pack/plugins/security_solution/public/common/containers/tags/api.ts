/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  ITagsClient,
  TagAttributes,
  Tag as TagResponse,
} from '@kbn/saved-objects-tagging-plugin/common';
import { INTERNAL_TAGS_URL } from '../../../../common/constants';

export interface Tag {
  id: string;
  managed: boolean;
  attributes: TagAttributes;
}

export const getTagsByName = (
  { http, tagName }: { http: HttpSetup; tagName: string },
  abortSignal?: AbortSignal
): Promise<Tag[]> =>
  http.get(INTERNAL_TAGS_URL, {
    version: '1',
    query: { name: tagName },
    signal: abortSignal,
  });

// Dashboard listing needs savedObjectsTaggingClient to work correctly with cache.
// https://github.com/elastic/kibana/issues/160723#issuecomment-1641904984
export const createTag = ({
  savedObjectsTaggingClient,
  tag,
}: {
  savedObjectsTaggingClient: ITagsClient;
  tag: TagAttributes;
}): Promise<TagResponse> => savedObjectsTaggingClient.create(tag);
