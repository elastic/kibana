/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type RelevantPanel, relevantPanelSchema } from './schema/relevant_panel/v1';
export {
  type RelatedDashboard,
  type SuggestedDashboard,
  relatedDashboardSchema,
  suggestedDashboardSchema,
} from './schema/related_dashboard/v1';
export {
  type GetRelatedDashboardsResponse,
  getRelatedDashboardsResponseSchema,
  getRelatedDashboardsParamsSchema,
} from './rest_specs/get_related_dashboards/v1';
