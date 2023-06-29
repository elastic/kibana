/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_INVESTIGATE_IN_TIMELINE_CELL_ACTION } from '../../screens/dashboards/common';

export const investigateDashboardItemInTimeline = (selector: string, itemIndex: number = 0) => {
  cy.get(selector).eq(itemIndex).trigger('mouseover');
  cy.get(DASHBOARD_INVESTIGATE_IN_TIMELINE_CELL_ACTION).should('be.visible').trigger('click');
};
