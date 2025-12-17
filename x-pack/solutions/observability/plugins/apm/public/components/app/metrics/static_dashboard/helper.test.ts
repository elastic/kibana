/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSavedDashboardToPanels } from './helper';

describe('APM metrics static dashboard helpers', () => {
  describe('convertSavedDashboardToPanels', () => {
    describe('when dashboard file does not exist', () => {
      it('returns undefined', async () => {
        const dataView = {
          id: 'id-1',
          name: 'apm-data-view',
        } as unknown as any;
        const panels = await convertSavedDashboardToPanels({}, dataView);

        expect(panels).toBeUndefined();
      });
    });

    it.skip('replaces placeholders in JSON with index pattern values', async () => {
      const dataView = {
        id: 'id-1',
        name: 'apm-data-view',
      } as unknown as any;

      const panels = await convertSavedDashboardToPanels(
        {
          agentName: 'java',
        },
        dataView
      );
      expect(panels[0]).not.toBeUndefined();
    });
  });
});
