/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/public';
import {
  INTERNAL_TAGS_URL,
  INTERNAL_DASHBOARDS_URL,
  SECURITY_TAG_NAME,
  SECURITY_TAG_DESCRIPTION,
} from '../../../../../common/constants';
import type { DashboardTableItem } from '../types';

export const getSecuritySolutionTags = ({ http }: { http: HttpSetup }): Promise<Tag[]> =>
  http.get(INTERNAL_TAGS_URL, { query: { name: SECURITY_TAG_NAME } });

export const createSecuritySolutionTag = ({ http }: { http: HttpSetup }): Promise<Tag> =>
  http.put(INTERNAL_TAGS_URL, {
    body: JSON.stringify({ name: SECURITY_TAG_NAME, description: SECURITY_TAG_DESCRIPTION }),
  });

export const getDashboardsByTags = ({
  http,
  tagIds,
}: {
  http: HttpSetup;
  tagIds: string[];
}): Promise<DashboardTableItem[] | null> =>
  http.post(INTERNAL_DASHBOARDS_URL, { body: JSON.stringify({ tagIds }) });
