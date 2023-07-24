/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/public';
import type { TagAttributes } from '@kbn/saved-objects-tagging-plugin/common';
import { INTERNAL_TAGS_URL } from '../../../../common/constants';

export const getTagsByName = (
  { http, tagName }: { http: HttpSetup; tagName: string },
  abortSignal?: AbortSignal
): Promise<Tag[]> => http.get(INTERNAL_TAGS_URL, { query: { name: tagName }, signal: abortSignal });

export const createTag = (
  { http, tag }: { http: HttpSetup; tag: Omit<TagAttributes, 'color'> & { color?: string } },
  abortSignal?: AbortSignal
): Promise<Tag> =>
  http.put(INTERNAL_TAGS_URL, {
    body: JSON.stringify(tag),
    signal: abortSignal,
  });
