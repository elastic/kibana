/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaSavedObjectType } from '@kbn/fleet-plugin/common';

export interface DashboardReference {
  type: KibanaSavedObjectType.dashboard;
  id: string;
}

export interface Section {
  title: string;
  dashboards: DashboardReference[];
}

export interface GetDashboardsSectionsResponse {
  sections: Section[];
}

export interface ObsDashboardSections {
  sections: Section[];
}
