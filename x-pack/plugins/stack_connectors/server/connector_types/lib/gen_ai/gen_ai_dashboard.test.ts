/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboard } from './gen_ai_dashboard'; // Replace with your actual file path
import { getDashboardTitle } from './gen_ai_dashboard';
import { GEMINI_TITLE, GEMINI_CONNECTOR_ID } from '../../../../common/gemini/constants'; // Replace with your actual constants file path

jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('getDashboard', () => {
  const dashboardId = 'test-dashboard-id';

  it.each([['Gemini', GEMINI_TITLE, GEMINI_CONNECTOR_ID]])(
    'returns correct dashboard for %s provider',
    (provider, expectedTitle, expectedActionTypeId) => {
      const dashboard = getDashboard(provider as 'OpenAI' | 'Bedrock' | 'Gemini', dashboardId);

      // Snapshot test for the entire dashboard object
      expect(dashboard).toMatchSnapshot();

      // Additional specific assertions (optional)
      expect(dashboard.id).toBe(dashboardId);
      expect(dashboard.attributes.title).toBe(getDashboardTitle(expectedTitle));
      expect(dashboard.attributes.description).toContain(expectedTitle);
    }
  );
});
