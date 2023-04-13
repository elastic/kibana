/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { getSecuritySolutionDashboards, getSecuritySolutionTags } from './api';
import type { DashboardTableItem } from './types';

/**
 * Request the security tag saved object and returns the id if exists.
 * It creates one if the tag doesn't exist.
 */
export const getSecurityTagIds = async (http: HttpSetup): Promise<string[] | undefined> => {
  const tagResponse = await getSecuritySolutionTags({ http });
  return tagResponse?.map(({ id }: { id: string }) => id);
};

/**
 * Requests the saved objects of the security tagged dashboards
 */
export const getSecurityDashboards = async (
  http: HttpSetup
): Promise<DashboardTableItem[] | null> => {
  const dashboardsResponse = await getSecuritySolutionDashboards({ http });

  return dashboardsResponse;
};
