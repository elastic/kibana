/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/public';
import { INTERNAL_TAGS_URL, INTERNAL_DASHBOARDS_URL } from '../../../../../common/constants';
import type { DashboardTableItem } from '../types';

export const getSecuritySolutionTags = ({ http }: { http: HttpSetup }): Promise<Tag[] | null> =>
  http.get(INTERNAL_TAGS_URL);

export const getSecuritySolutionDashboards = ({
  http,
}: {
  http: HttpSetup;
}): Promise<DashboardTableItem[] | null> => http.get(INTERNAL_DASHBOARDS_URL);
