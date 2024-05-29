/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('getDashboard', () => {
  const dashboardId = 'test-dashboard-id';

  it.each([['Gemini', 'Google Gemini', '.gemini']])(
    'returns correct dashboard for %s provider',
     (provider, expectedTitle, expectedActionTypeId) => {
      let importGetDashboard = require ('./gen_ai_dashboard');
      const dashboard = importGetDashboard.getDashboard('Gemini', dashboardId);

      // Snapshot test for the entire dashboard object
      expect(dashboard).toMatchSnapshot();

      // Additional specific assertions (optional)
      expect(dashboard.id).toBe(dashboardId);
      expect(dashboard.attributes.title).toBe(importGetDashboard.getDashboardTitle(expectedTitle));
      expect(dashboard.attributes.description).toContain(expectedTitle);
    }
  );
});
